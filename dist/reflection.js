import { markPlanForReflection } from './planner.js';
export function reflectionTrigger(state, config) {
    if (!config.reflection || state.reflectionRounds >= config.maxReflectionRounds) {
        return { triggered: false, reasons: [] };
    }
    const reasons = [];
    if (state.budget.errors >= config.reflectionErrorThreshold) {
        reasons.push(`${state.budget.errors} agent/runtime errors occurred`);
    }
    if (state.budget.consecutiveToolFailures >= config.reflectionFailureThreshold) {
        reasons.push(`${state.budget.consecutiveToolFailures} consecutive tool calls failed`);
    }
    if (state.budget.maxRepeatedOutcomeRun >= config.repeatedToolSoftRun) {
        reasons.push(`the same tool action produced the same observable outcome ${state.budget.maxRepeatedOutcomeRun} times`);
    }
    else if (state.budget.maxRepeatedFingerprintRun >= Math.max(4, config.repeatedToolSoftRun + 1)) {
        reasons.push(`the same tool action repeated ${state.budget.maxRepeatedFingerprintRun} times`);
    }
    const noProgressSteps = Math.max(0, state.budget.steps - state.budget.lastProgressStep);
    if (noProgressSteps >= config.maxNoProgressSteps)
        reasons.push(`no observable progress for ${noProgressSteps} steps`);
    return { triggered: reasons.length > 0, reasons };
}
export function prepareReflection(state) {
    state.reflectionRounds += 1;
    state.reflectionInjectedAtToolCount = state.budget.toolCalls;
    state.plan = markPlanForReflection(state.plan);
}
export function reflectionPrompt(state, reasons) {
    const failed = state.observations.filter(item => item.isError).slice(-4);
    const repeated = state.observations.slice(-Math.max(2, state.budget.currentRepeatedOutcomeRun || 0));
    return [
        'Smart Runtime recovery checkpoint.',
        `Trigger: ${reasons.join('; ')}.`,
        failed.length > 0 ? `Recent failed observations:\n${failed.map(item => `- ${item.tool}: ${item.resultPreview}`).join('\n')}` : '',
        state.budget.currentRepeatedOutcomeRun > 1 && repeated.length > 0
            ? `Repeated unchanged outcome: ${repeated.at(-1)?.tool ?? 'unknown tool'} returned effectively the same result ${state.budget.currentRepeatedOutcomeRun} times.`
            : '',
        'Do not mechanically repeat the same failed or unchanged action. Diagnose from observable output, revise the plan, and choose a materially different action. If the environment is genuinely blocking progress, stop generating motion and report the blocker precisely.',
    ].filter(Boolean).join('\n');
}
//# sourceMappingURL=reflection.js.map