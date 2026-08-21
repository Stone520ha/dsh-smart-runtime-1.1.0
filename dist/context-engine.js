import { planCompletion } from './planner.js';
import { preview, unique } from './util.js';
export function shouldInjectContext(state, step, config) {
    if (!config.contextInjection)
        return false;
    if (step === 1)
        return true;
    return step - state.contextInjectionStep >= config.contextRefreshEverySteps;
}
/**
 * Five-layer bounded context projection inspired by production coding-agent
 * context stacks, but implemented only from DSH-observable durable state.
 * No hidden reasoning or proprietary prompt material is reconstructed.
 */
export function buildRuntimeContext(state, config, delegation) {
    if (!config.contextLayering)
        return buildFlatContext(state, config, delegation);
    const sections = [
        stableGoalLayer(state),
        activePlanLayer(state),
        workingEvidenceLayer(state, config),
        distilledStateLayer(state),
        archiveControlLayer(state, config, delegation),
    ];
    return capContext(sections.filter(Boolean).join('\n\n'), config.contextMaxChars);
}
function stableGoalLayer(state) {
    const lines = ['[Smart Runtime L1 · stable goal]'];
    lines.push(`Strategy: ${state.strategy}`);
    lines.push(`Objective: ${state.goal.objective}`);
    if (state.goal.acceptanceCriteria.length > 0) {
        lines.push('Acceptance criteria:');
        for (const item of state.goal.acceptanceCriteria.slice(0, 8))
            lines.push(`- ${preview(item, 260)}`);
    }
    if (state.goal.constraints.length > 0) {
        lines.push('Constraints:');
        for (const item of state.goal.constraints.slice(0, 6))
            lines.push(`- ${preview(item, 240)}`);
    }
    return lines.join('\n');
}
function activePlanLayer(state) {
    const lines = ['[Smart Runtime L2 · active plan]'];
    if (state.plan.length === 0) {
        lines.push('No explicit plan is required for this strategy.');
        return lines.join('\n');
    }
    lines.push(`Plan progress: ${Math.round(planCompletion(state.plan) * 100)}%`);
    for (const item of state.plan) {
        const marker = item.status === 'done' ? '✓' : item.status === 'blocked' ? '!' : item.status === 'active' ? '→' : '·';
        lines.push(`${marker} ${item.title}${item.note ? ` — ${preview(item.note, 160)}` : ''}`);
    }
    const active = state.plan.find(item => item.status === 'active');
    if (active)
        lines.push(`Next concrete milestone: ${active.title} — done when: ${preview(active.doneWhen, 260)}`);
    return lines.join('\n');
}
function workingEvidenceLayer(state, config) {
    const lines = ['[Smart Runtime L3 · working evidence]'];
    const recent = state.observations.slice(-config.maxEvidenceItems);
    if (recent.length === 0) {
        lines.push('No tool/world-state evidence has been recorded yet.');
        return lines.join('\n');
    }
    for (const obs of recent) {
        lines.push(`- ${obs.isError ? 'FAIL' : 'OK'} ${obs.tool}: ${preview(obs.resultPreview || obs.summary, config.evidencePreviewChars)}`);
    }
    return lines.join('\n');
}
function distilledStateLayer(state) {
    const lines = ['[Smart Runtime L4 · distilled state]'];
    const successfulTools = unique(state.observations.filter(item => !item.isError).map(item => item.tool));
    const failedTools = unique(state.observations.filter(item => item.isError).map(item => item.tool));
    lines.push(`Successful tool surfaces: ${successfulTools.join(', ') || 'none'}`);
    lines.push(`Failed tool surfaces: ${failedTools.join(', ') || 'none'}`);
    lines.push(`Repeated identical-action run: ${state.budget.currentRepeatedFingerprintRun} (max ${state.budget.maxRepeatedFingerprintRun})`);
    lines.push(`Recovery rounds: reflection=${state.reflectionRounds}, verification=${state.verificationRounds}, stop-steers=${state.liveness.stopSteers}`);
    const blocked = state.plan.filter(item => item.status === 'blocked');
    if (blocked.length > 0) {
        lines.push('Blocked milestones:');
        for (const item of blocked.slice(0, 4))
            lines.push(`- ${item.title}${item.note ? `: ${preview(item.note, 180)}` : ''}`);
    }
    const latestFailure = [...state.observations].reverse().find((item) => item.isError);
    if (latestFailure)
        lines.push(`Latest failure: ${latestFailure.tool}: ${preview(latestFailure.resultPreview, 260)}`);
    return lines.join('\n');
}
function archiveControlLayer(state, config, delegation) {
    const lines = ['[Smart Runtime L5 · archive/control]'];
    lines.push(`Budget: steps=${state.budget.steps}/${config.hardMaxStepsPerTurn}, tools=${state.budget.toolCalls}/${config.maxToolCallsPerTurn}, errors=${state.budget.errors}/${config.maxErrorsPerTurn}`);
    lines.push(`Stop boundaries=${state.liveness.stopBoundaryVisits}, same-state stops=${state.liveness.sameEvidenceStopVisits}`);
    const recentCheckpoints = state.checkpoints.slice(-config.maxArchiveCheckpointItems);
    if (recentCheckpoints.length > 0) {
        lines.push('Recent checkpoints:');
        for (const cp of recentCheckpoints)
            lines.push(`- ${cp.kind}@${cp.step}: ${preview(cp.note, 180)}`);
    }
    if (delegation?.shouldConsiderDelegation) {
        lines.push(`Delegation: ${delegation.reason}`);
        lines.push(`Available providers: ${delegation.availableProviders.join(', ') || 'none'}`);
        if (delegation.preferredProviders.length > 0)
            lines.push(`Preferred for this strategy: ${delegation.preferredProviders.join(', ')}`);
        if (delegation.isolationGuidance)
            lines.push(`Isolation rule: ${delegation.isolationGuidance}`);
    }
    lines.push('Use this state to choose the next concrete action. Do not narrate hidden chain-of-thought. Prefer observable execution and evidence over verbal promises.');
    return lines.join('\n');
}
function buildFlatContext(state, config, delegation) {
    const lines = [];
    lines.push('[Smart Runtime working state]');
    lines.push(`Strategy: ${state.strategy}`);
    lines.push(`Goal: ${state.goal.objective}`);
    if (state.plan.length > 0)
        lines.push(`Plan progress: ${Math.round(planCompletion(state.plan) * 100)}%`);
    for (const obs of state.observations.slice(-config.maxEvidenceItems)) {
        lines.push(`- ${obs.isError ? 'FAIL' : 'OK'} ${obs.tool}: ${preview(obs.resultPreview || obs.summary, config.evidencePreviewChars)}`);
    }
    lines.push(`Budget: steps=${state.budget.steps}/${config.hardMaxStepsPerTurn}, tools=${state.budget.toolCalls}/${config.maxToolCallsPerTurn}, errors=${state.budget.errors}/${config.maxErrorsPerTurn}`);
    if (delegation?.shouldConsiderDelegation)
        lines.push(`Delegation: ${delegation.reason}`);
    return capContext(lines.join('\n'), config.contextMaxChars);
}
export function summarizeEvidence(observations) {
    const successful = observations.filter(item => !item.isError);
    const failed = observations.filter(item => item.isError);
    return [
        `${successful.length} successful observations`,
        `${failed.length} failed observations`,
        `${unique(successful.map(item => item.tool)).length} successful tool surfaces`,
    ];
}
export function capContext(text, maxChars) {
    if (text.length <= maxChars)
        return text;
    const suffix = '\n[Smart Runtime context truncated to configured bound]';
    return `${text.slice(0, Math.max(0, maxChars - suffix.length))}${suffix}`;
}
//# sourceMappingURL=context-engine.js.map