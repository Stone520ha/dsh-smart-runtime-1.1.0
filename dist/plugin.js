import { createUserMessage } from '@deepseek-ai/dsh-llm';
import { resolveConfig } from './config.js';
import { routeStrategy, strategyInstruction } from './router.js';
import { textOfUserMessages } from './messages.js';
import { StateRepository } from './state.js';
import { updateStepBudget, evaluateBudget, convergencePrompt, recordAgentError } from './budget.js';
import { createObservation, applyObservationToBudget } from './observations.js';
import { shouldInjectContext, buildRuntimeContext } from './context-engine.js';
import { delegationAdvice, discoverSubagentService } from './delegation.js';
import { reflectionPrompt, reflectionTrigger, prepareReflection } from './reflection.js';
import { assessVerification, shouldRunVerification, verificationPrompt } from './verifier.js';
import { evaluateLivenessPreStep, livenessRecoveryPrompt, maySteerAtStop, observeStopBoundary, recordStopSteer, repeatedToolPrompt, shouldAllowDegradedConvergence, } from './liveness.js';
import { logBudgetStop, logTurnState, logVerification } from './telemetry.js';
import { hashText } from './util.js';
const SOURCE = { kind: 'plugin', plugin: 'smart-runtime' };
export function applySmartRuntime(ctx, rawConfig) {
    const config = resolveConfig(rawConfig);
    if (!config.enabled)
        return;
    const repository = new StateRepository(config.persistentState);
    const activeTurn = new WeakMap();
    const subagents = discoverSubagentService(ctx);
    ctx.on('agent/pre-step', async ({ agent, messages, turn, step }, next) => {
        activeTurn.set(agent, turn);
        const session = agent.session;
        const prompt = textOfUserMessages(messages);
        let state = repository.get(session, turn);
        if (!state) {
            const routed = config.strategyRouting ? routeStrategy(prompt) : { strategy: 'direct', confidence: 1, scores: [] };
            state = repository.initialize(session, {
                sessionId: String(agent.id),
                turn,
                prompt: prompt || `Continue session ${String(agent.id)} turn ${turn}`,
                strategy: routed.strategy,
                routeConfidence: routed.confidence,
                planning: config.planning,
            });
            repository.addCheckpoint(session, state, checkpoint(state, 'strategy', step, `strategy=${state.strategy}`));
        }
        updateStepBudget(state, step);
        const liveness = evaluateLivenessPreStep(state, config);
        if (liveness.kind === 'hard') {
            repository.addCheckpoint(session, state, checkpoint(state, 'liveness', step, `hard stall: ${liveness.reason}`));
            repository.saveSnapshot(session, state);
            if (config.telemetry)
                ctx.logger.warn(`[smart-runtime] hard liveness stop turn=${turn} step=${step}: ${liveness.reason}`);
            return { kind: 'reject' };
        }
        const budget = evaluateBudget(state, config);
        if (budget.kind === 'hard') {
            repository.addCheckpoint(session, state, checkpoint(state, 'hard-budget', step, budget.reasons.join('; ')));
            repository.saveSnapshot(session, state);
            if (config.telemetry)
                logBudgetStop(ctx.logger, state, budget.reasons);
            return { kind: 'reject' };
        }
        const downstream = await next();
        if (downstream.kind !== 'enter')
            return downstream;
        const additions = [];
        if (step === 1 && config.strategyRouting) {
            additions.push(notice(`Execution mode: ${state.strategy}.\n${strategyInstruction(state.strategy)}\nTreat this as orchestration guidance; do not narrate hidden reasoning.`, `strategy:${state.strategy}`));
        }
        if (shouldInjectContext(state, step, config)) {
            const advice = delegationAdvice(state.strategy, subagents, config);
            additions.push(notice(buildRuntimeContext(state, config, advice), `state:${state.strategy}:turn-${turn}:step-${step}`));
            state.contextInjectionStep = step;
            repository.addCheckpoint(session, state, checkpoint(state, 'context', step, `context refreshed at step ${step}`));
        }
        if (liveness.kind === 'soft') {
            additions.push(notice(repeatedToolPrompt(state, liveness.reason), `liveness:repeat:${state.budget.currentRepeatedFingerprintRun}`));
            repository.addCheckpoint(session, state, checkpoint(state, 'liveness', step, liveness.reason));
        }
        if (budget.kind === 'soft' && !state.softBudgetNoticeInjected) {
            state.softBudgetNoticeInjected = true;
            additions.push(notice(convergencePrompt(state, budget.reasons), `budget:${step}/${config.hardMaxStepsPerTurn}`));
            repository.addCheckpoint(session, state, checkpoint(state, 'soft-budget', step, budget.reasons.join('; ')));
        }
        repository.saveSnapshot(session, state);
        if (config.telemetry)
            logTurnState(ctx.logger, state);
        return { kind: 'enter', messages: [...additions, ...downstream.messages] };
    });
    ctx.on('tools/post-execute', async (exec, result, next) => {
        const downstream = await next();
        if (!exec.agent)
            return downstream;
        const turn = activeTurn.get(exec.agent);
        if (turn === undefined)
            return downstream;
        const session = exec.agent.session;
        const state = repository.get(session, turn);
        if (!state)
            return downstream;
        const effective = effectiveToolResult(result, downstream);
        const observation = createObservation(state, {
            callId: String(exec.callId),
            name: exec.name,
            arguments: exec.arguments,
        }, effective, config.evidencePreviewChars);
        applyObservationToBudget(state, observation);
        repository.addObservation(session, state, observation, Math.max(config.maxEvidenceItems * 3, 24));
        return downstream;
    });
    ctx.on('agent/error', ({ agent, turn, step, error }) => {
        activeTurn.set(agent, turn);
        const session = agent.session;
        const state = repository.get(session, turn);
        if (!state)
            return;
        recordAgentError(state);
        repository.addCheckpoint(session, state, checkpoint(state, 'convergence', step, `agent error: ${errorText(error)}`));
        repository.saveSnapshot(session, state);
    });
    ctx.on('agent/turn-stopping', ({ agent, turn }) => {
        activeTurn.set(agent, turn);
        const session = agent.session;
        const state = repository.get(session, turn);
        if (!state)
            return;
        const stopObservation = observeStopBoundary(state);
        const assessment = assessVerification(state, config);
        if (shouldAllowDegradedConvergence(state, config)) {
            repository.addCheckpoint(session, state, checkpoint(state, 'liveness', state.budget.steps, `bounded convergence after stopSteers=${state.liveness.stopSteers}, sameStateVisits=${state.liveness.sameEvidenceStopVisits}; score=${assessment.score.toFixed(2)}`));
            repository.saveSnapshot(session, state);
            return;
        }
        const reflection = reflectionTrigger(state, config);
        const reflectionHasNewEvidence = state.reflectionInjectedAtToolCount === undefined
            || state.reflectionInjectedAtToolCount !== state.budget.toolCalls;
        if (reflection.triggered && reflectionHasNewEvidence && maySteerAtStop(state, config)) {
            prepareReflection(state);
            recordStopSteer(state);
            repository.addCheckpoint(session, state, checkpoint(state, 'reflection', state.budget.steps, reflection.reasons.join('; ')));
            repository.saveSnapshot(session, state);
            agent.steer(notice(reflectionPrompt(state, reflection.reasons), `reflection:${state.reflectionRounds}`));
            return;
        }
        if (!shouldRunVerification(state, config)) {
            repository.saveSnapshot(session, state);
            return;
        }
        if (config.telemetry)
            logVerification(ctx.logger, state, assessment);
        if (assessment.pass) {
            repository.addCheckpoint(session, state, checkpoint(state, 'verification', state.budget.steps, `pass score=${assessment.score.toFixed(2)}`));
            repository.saveSnapshot(session, state);
            return;
        }
        if (!maySteerAtStop(state, config)) {
            repository.addCheckpoint(session, state, checkpoint(state, 'liveness', state.budget.steps, 'stop steer budget exhausted; allowing bounded convergence'));
            repository.saveSnapshot(session, state);
            return;
        }
        state.verificationRounds += 1;
        state.verificationInjectedAtToolCount = state.budget.toolCalls;
        recordStopSteer(state);
        const recoveringFromSameState = stopObservation.sameState || state.liveness.sameEvidenceStopVisits > 0;
        const promptText = recoveringFromSameState
            ? livenessRecoveryPrompt(state, assessment, 'the agent returned to the stop boundary without new tool evidence or plan progress')
            : verificationPrompt(state, assessment);
        repository.addCheckpoint(session, state, checkpoint(state, recoveringFromSameState ? 'liveness' : 'verification', state.budget.steps, `steer=${state.liveness.stopSteers} round=${state.verificationRounds} score=${assessment.score.toFixed(2)} blockers=${assessment.blockers.join(' | ')}`));
        repository.saveSnapshot(session, state);
        agent.steer(notice(promptText, recoveringFromSameState
            ? `liveness:stop:${state.liveness.stopSteers}`
            : `verify:${state.strategy}:${state.verificationRounds}`));
    });
    ctx.on('agent/disposed', ({ agent }) => {
        activeTurn.delete(agent);
        repository.dispose(agent.session);
    });
}
function notice(text, summary) {
    return createUserMessage({
        content: [{ type: 'text', text }],
        source: { ...SOURCE, form: 'notice', summary },
    });
}
function checkpoint(state, kind, step, note) {
    const at = Date.now();
    return {
        id: `cp-${state.turn}-${step}-${kind}-${hashText(`${note}:${at}`)}`,
        turn: state.turn,
        kind,
        step,
        note,
        at,
    };
}
function effectiveToolResult(result, decision) {
    if (decision.kind === 'block') {
        return {
            isError: true,
            content: decision.feedback,
            error: { message: 'tool result blocked by post-execute policy' },
        };
    }
    return {
        isError: result.isError,
        content: decision.content ?? result.content,
        ...(result.isError ? { error: result.error } : { value: 'value' in decision ? decision.value : result.value }),
    };
}
function errorText(error) {
    if (error instanceof Error)
        return error.message;
    try {
        return String(error);
    }
    catch {
        return '<unprintable error>';
    }
}
//# sourceMappingURL=plugin.js.map