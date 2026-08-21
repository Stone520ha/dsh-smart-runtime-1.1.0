export function updateStepBudget(state, step) {
    state.budget.steps = Math.max(state.budget.steps, step);
}
export function recordAgentError(state) {
    state.budget.errors += 1;
}
export function evaluateBudget(state, config, at = Date.now()) {
    const hard = [];
    const soft = [];
    const elapsed = at - state.budget.startedAt;
    const noProgressSteps = Math.max(0, state.budget.steps - state.budget.lastProgressStep);
    if (state.budget.steps > config.hardMaxStepsPerTurn)
        hard.push(`step budget exceeded (${state.budget.steps}/${config.hardMaxStepsPerTurn})`);
    if (state.budget.toolCalls >= config.maxToolCallsPerTurn)
        hard.push(`tool-call budget reached (${state.budget.toolCalls}/${config.maxToolCallsPerTurn})`);
    if (state.budget.errors >= config.maxErrorsPerTurn)
        hard.push(`error budget reached (${state.budget.errors}/${config.maxErrorsPerTurn})`);
    if (elapsed >= config.maxDurationMs)
        hard.push(`turn duration budget reached (${elapsed}ms/${config.maxDurationMs}ms)`);
    if (hard.length > 0)
        return { kind: 'hard', reasons: hard };
    if (state.budget.steps >= config.softMaxStepsPerTurn)
        soft.push(`step count is high (${state.budget.steps}/${config.hardMaxStepsPerTurn})`);
    if (state.budget.toolCalls >= Math.max(4, Math.floor(config.maxToolCallsPerTurn * 0.75)))
        soft.push(`tool-call count is high (${state.budget.toolCalls}/${config.maxToolCallsPerTurn})`);
    if (elapsed >= Math.floor(config.maxDurationMs * 0.8))
        soft.push('turn duration is approaching its limit');
    if (noProgressSteps >= config.maxNoProgressSteps)
        soft.push(`no observable tool progress for ${noProgressSteps} steps`);
    return soft.length > 0 ? { kind: 'soft', reasons: soft } : { kind: 'continue' };
}
export function convergencePrompt(state, reasons) {
    return [
        'Smart Runtime convergence checkpoint.',
        `Reasons: ${reasons.join('; ')}.`,
        `Goal: ${state.goal.objective}`,
        'Re-check the original acceptance criteria. Stop expanding scope. Use only indispensable remaining actions, prefer direct verification over more exploration, and explicitly report any unresolved limitation.',
    ].join('\n');
}
//# sourceMappingURL=budget.js.map