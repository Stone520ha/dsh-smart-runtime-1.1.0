import type { RuntimeLogger, RuntimeState, VerificationAssessment } from './types.js'

export function logTurnState(logger: RuntimeLogger, state: RuntimeState): void {
  logger.debug?.(
    `smart-runtime: session=${state.sessionId} turn=${state.turn} strategy=${state.strategy} steps=${state.budget.steps} tools=${state.budget.toolCalls} errors=${state.budget.errors}`,
  )
}

export function logVerification(logger: RuntimeLogger, state: RuntimeState, assessment: VerificationAssessment): void {
  logger.info?.(
    `smart-runtime: verify session=${state.sessionId} turn=${state.turn} strategy=${state.strategy} score=${assessment.score.toFixed(2)} pass=${assessment.pass} evidence=${assessment.evidenceCount}`,
  )
}

export function logBudgetStop(logger: RuntimeLogger, state: RuntimeState, reasons: readonly string[]): void {
  logger.warn(`smart-runtime: hard budget stop session=${state.sessionId} turn=${state.turn}: ${reasons.join('; ')}`)
}
