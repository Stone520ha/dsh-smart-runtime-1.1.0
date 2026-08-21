import test from 'node:test'
import assert from 'node:assert/strict'
import { createFreshState } from '../dist/state.js'
import { evaluateBudget, updateStepBudget } from '../dist/budget.js'

const config = {
  enabled: true, persistentState: true, strategyRouting: true, planning: true,
  contextInjection: true, contextRefreshEverySteps: 4, contextMaxChars: 7000,
  evidencePreviewChars: 420, maxEvidenceItems: 10, verification: true,
  verificationMinScore: 0.62, maxVerificationRounds: 2, reflection: true,
  reflectionErrorThreshold: 2, reflectionFailureThreshold: 2, maxReflectionRounds: 2,
  softMaxStepsPerTurn: 18, hardMaxStepsPerTurn: 28, maxToolCallsPerTurn: 48,
  maxErrorsPerTurn: 8, maxDurationMs: 900000, maxNoProgressSteps: 8,
  verifyStrategies: ['research','code','analysis','design','long-task'], delegationHints: true,
  preferredCodeProviders: ['codex','claude-code'], preferredResearchProviders: ['spawn','fork'], telemetry: true,
}

function state() {
  return createFreshState({ sessionId: 's', turn: 1, prompt: 'code task', strategy: 'code', routeConfidence: .9, planning: true })
}

test('normal budget continues', () => {
  assert.equal(evaluateBudget(state(), config).kind, 'continue')
})

test('soft step budget asks convergence', () => {
  const s = state(); updateStepBudget(s, 18)
  assert.equal(evaluateBudget(s, config).kind, 'soft')
})

test('hard step budget rejects', () => {
  const s = state(); updateStepBudget(s, 29)
  assert.equal(evaluateBudget(s, config).kind, 'hard')
})

test('tool budget is hard', () => {
  const s = state(); s.budget.toolCalls = 48
  assert.equal(evaluateBudget(s, config).kind, 'hard')
})

test('error budget is hard', () => {
  const s = state(); s.budget.errors = 8
  assert.equal(evaluateBudget(s, config).kind, 'hard')
})

test('duration budget is hard', () => {
  const s = state(); s.budget.startedAt = Date.now() - 900001
  assert.equal(evaluateBudget(s, config).kind, 'hard')
})
