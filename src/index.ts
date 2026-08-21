import type { Context } from '@deepseek-ai/cordis'
import type { Config as SmartConfig } from './types.js'
import { ConfigSchema } from './config.js'
import { applySmartRuntime } from './plugin.js'

export const name = 'smart-runtime'
export const Config = ConfigSchema

export function apply(ctx: Context, config: SmartConfig): void {
  applySmartRuntime(ctx, config)
}

export { classifyStrategy, routeStrategy, strategyInstruction } from './router.js'
export { createGoal } from './goal.js'
export { createPlan, updatePlan, planCompletion } from './planner.js'
export { assessVerification, verificationPrompt } from './verifier.js'
export { reflectionTrigger, reflectionPrompt } from './reflection.js'
export { evaluateBudget } from './budget.js'
export { buildRuntimeContext, summarizeEvidence } from './context-engine.js'
export {
  evaluateLivenessPreStep,
  observeStopBoundary,
  shouldAllowDegradedConvergence,
  livenessRecoveryPrompt,
} from './liveness.js'
export { foldRuntimeState, StateRepository } from './state.js'
export type {
  Strategy,
  PlanStatus,
  PlanItem,
  GoalState,
  ToolObservation,
  Checkpoint,
  BudgetState,
  LivenessState,
  VerificationAssessment,
  DelegationAdvice,
  RuntimeState,
  Config as SmartRuntimeConfig,
  ResolvedConfig,
} from './types.js'
