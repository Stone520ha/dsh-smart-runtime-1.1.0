import test from 'node:test'
import assert from 'node:assert/strict'
import { createFreshState } from '../dist/state.js'
import { buildRuntimeContext, capContext, shouldInjectContext } from '../dist/context-engine.js'
import { delegationAdvice } from '../dist/delegation.js'

const config = {
  enabled:true,persistentState:true,strategyRouting:true,planning:true,contextInjection:true,contextLayering:true,contextRefreshEverySteps:4,contextMaxChars:4000,evidencePreviewChars:120,maxEvidenceItems:3,maxArchiveCheckpointItems:6,
  verification:true,verificationMinScore:.62,maxVerificationRounds:2,reflection:true,reflectionErrorThreshold:2,reflectionFailureThreshold:2,maxReflectionRounds:2,livenessGuard:true,repeatedToolSoftRun:3,repeatedToolHardRun:8,maxStopSteers:3,maxSameEvidenceStopVisits:2,
  softMaxStepsPerTurn:18,hardMaxStepsPerTurn:28,maxToolCallsPerTurn:48,maxErrorsPerTurn:8,maxDurationMs:900000,maxNoProgressSteps:8,
  verifyStrategies:['research','code','analysis','design','long-task'],delegationHints:true,subagentIsolationHints:true,preferredCodeProviders:['codex','claude-code'],preferredResearchProviders:['spawn','fork'],telemetry:true,
}

test('context is bounded', () => {
  const text = capContext('x'.repeat(5000), 1000)
  assert.ok(text.length <= 1000)
})

test('context includes goal and budget', () => {
  const s = createFreshState({ sessionId:'s', turn:1, prompt:'fix code', strategy:'code', routeConfidence:.9, planning:true })
  const advice = { availableProviders:['codex'], preferredProviders:['codex'], shouldConsiderDelegation:true, reason:'available' }
  const text = buildRuntimeContext(s, config, advice)
  assert.match(text, /Objective:/)
  assert.match(text, /Budget:/)
  assert.match(text, /codex/)
})

test('context refresh cadence works', () => {
  const s = createFreshState({ sessionId:'s', turn:1, prompt:'x', strategy:'direct', routeConfidence:1, planning:false })
  assert.equal(shouldInjectContext(s, 1, config), true)
  s.contextInjectionStep = 1
  assert.equal(shouldInjectContext(s, 3, config), false)
  assert.equal(shouldInjectContext(s, 5, config), true)
})

test('delegation advice detects preferred provider', () => {
  const service = { list: () => ['codex','other'] }
  const advice = delegationAdvice('code', service, config)
  assert.equal(advice.shouldConsiderDelegation, true)
  assert.deepEqual(advice.preferredProviders, ['codex'])
})
