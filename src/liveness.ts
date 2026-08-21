import type { ResolvedConfig, RuntimeState, VerificationAssessment } from './types.js'
import { planCompletion } from './planner.js'

export type LivenessPreStepDecision =
  | { kind: 'continue' }
  | { kind: 'soft'; reason: string }
  | { kind: 'hard'; reason: string }

export interface StopBoundaryObservation {
  sameEvidence: boolean
  samePlanProgress: boolean
  sameState: boolean
}

export function evaluateLivenessPreStep(state: RuntimeState, config: ResolvedConfig): LivenessPreStepDecision {
  if (!config.livenessGuard) return { kind: 'continue' }
  const actionRun = state.budget.currentRepeatedFingerprintRun
  const outcomeRun = state.budget.currentRepeatedOutcomeRun
  if (outcomeRun >= config.repeatedToolHardRun) {
    state.liveness.hardStallTrips += 1
    return {
      kind: 'hard',
      reason: `same tool-call action and outcome repeated ${outcomeRun} times without observable progress`,
    }
  }
  if (actionRun >= config.repeatedToolSoftRun && state.liveness.repeatedToolNoticeAtRun !== actionRun) {
    state.liveness.repeatedToolNoticeAtRun = actionRun
    return {
      kind: 'soft',
      reason: `same tool-call action has repeated ${actionRun} times; change the action or explain why repetition is necessary`,
    }
  }
  return { kind: 'continue' }
}

export function observeStopBoundary(state: RuntimeState): StopBoundaryObservation {
  const currentCompletion = planCompletion(state.plan)
  const sameEvidence = state.liveness.lastStopToolCount !== undefined
    && state.liveness.lastStopToolCount === state.budget.toolCalls
  const samePlanProgress = state.liveness.lastStopPlanCompletion !== undefined
    && Math.abs(state.liveness.lastStopPlanCompletion - currentCompletion) < 1e-9
  const sameState = sameEvidence && samePlanProgress

  state.liveness.stopBoundaryVisits += 1
  state.liveness.sameEvidenceStopVisits = sameState
    ? state.liveness.sameEvidenceStopVisits + 1
    : 0
  state.liveness.lastStopToolCount = state.budget.toolCalls
  state.liveness.lastStopPlanCompletion = currentCompletion
  state.liveness.lastStopAt = Date.now()
  return { sameEvidence, samePlanProgress, sameState }
}

export function maySteerAtStop(state: RuntimeState, config: ResolvedConfig): boolean {
  return config.livenessGuard && state.liveness.stopSteers < config.maxStopSteers
}

export function recordStopSteer(state: RuntimeState): void {
  state.liveness.stopSteers += 1
}

export function shouldAllowDegradedConvergence(state: RuntimeState, config: ResolvedConfig): boolean {
  if (!config.livenessGuard) return false
  return state.liveness.stopSteers >= config.maxStopSteers
    || state.liveness.sameEvidenceStopVisits >= config.maxSameEvidenceStopVisits
}

export function livenessRecoveryPrompt(
  state: RuntimeState,
  assessment: VerificationAssessment,
  reason: string,
): string {
  const blockers = assessment.blockers.length > 0
    ? assessment.blockers.map(item => `- ${item}`).join('\n')
    : '- Verification score is below the configured threshold.'
  return [
    'Smart Runtime liveness recovery checkpoint.',
    `Reason: ${reason}.`,
    `Goal: ${state.goal.objective}`,
    'The turn has reached a stop boundary without enough new observable progress.',
    'Do not merely promise the next action and do not repeat the same tool call.',
    'Choose exactly one of these paths now:',
    '1. Perform one concrete missing action that can create new evidence, then re-evaluate.',
    '2. If the action is impossible or blocked, stop trying to simulate progress and explicitly report the blocking limitation in the final answer.',
    'Current material gaps:',
    blockers,
  ].join('\n')
}

export function repeatedToolPrompt(state: RuntimeState, reason: string): string {
  const latest = state.observations.at(-1)
  return [
    'Smart Runtime anti-stall checkpoint.',
    `Reason: ${reason}.`,
    latest ? `Latest repeated tool: ${latest.tool}` : '',
    'Do not repeat an identical action again unless a changed precondition makes the result meaningfully different.',
    'Use a different tool, change the arguments, inspect the actual failure/output, or converge and report the limitation.',
  ].filter(Boolean).join('\n')
}
