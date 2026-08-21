export function logTurnState(logger, state) {
    logger.debug?.(`smart-runtime: session=${state.sessionId} turn=${state.turn} strategy=${state.strategy} steps=${state.budget.steps} tools=${state.budget.toolCalls} errors=${state.budget.errors}`);
}
export function logVerification(logger, state, assessment) {
    logger.info?.(`smart-runtime: verify session=${state.sessionId} turn=${state.turn} strategy=${state.strategy} score=${assessment.score.toFixed(2)} pass=${assessment.pass} evidence=${assessment.evidenceCount}`);
}
export function logBudgetStop(logger, state, reasons) {
    logger.warn(`smart-runtime: hard budget stop session=${state.sessionId} turn=${state.turn}: ${reasons.join('; ')}`);
}
//# sourceMappingURL=telemetry.js.map