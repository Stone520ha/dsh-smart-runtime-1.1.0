import test from 'node:test'
import assert from 'node:assert/strict'
import { createFreshState } from '../dist/state.js'
import { assessVerification } from '../dist/verifier.js'

const config = {
  enabled:true,persistentState:true,strategyRouting:true,planning:true,contextInjection:true,contextLayering:true,contextRefreshEverySteps:4,contextMaxChars:7000,evidencePreviewChars:420,maxEvidenceItems:10,maxArchiveCheckpointItems:6,
  verification:true,verificationMinScore:.62,maxVerificationRounds:2,reflection:true,reflectionErrorThreshold:2,reflectionFailureThreshold:2,maxReflectionRounds:2,
  livenessGuard:true,repeatedToolSoftRun:3,repeatedToolHardRun:8,maxStopSteers:3,maxSameEvidenceStopVisits:2,
  softMaxStepsPerTurn:18,hardMaxStepsPerTurn:28,maxToolCallsPerTurn:48,maxErrorsPerTurn:8,maxDurationMs:900000,maxNoProgressSteps:8,
  verifyStrategies:['research','code','analysis','design','long-task'],delegationHints:true,subagentIsolationHints:true,preferredCodeProviders:['codex','claude-code'],preferredResearchProviders:['spawn','fork'],telemetry:true,
}
function make(strategy, prompt='task') { return createFreshState({ sessionId:'s', turn:1, prompt, strategy, routeConfidence:.9, planning:true }) }
let seq=0
function observation(tool, resultPreview, isError=false, id=`o${++seq}`, args='') {
  return { id,turn:1,tool,callId:id,fingerprint:`f-${tool}-${args}`,outcomeFingerprint:`of-${tool}-${resultPreview}-${isError}`,isError,summary:'',argumentPreview:args,resultPreview,at:Date.now() }
}

test('code without tests and mutation fails verification', () => {
  const s = make('code', 'fix and modify this code')
  s.observations.push(observation('read_file', 'source code'))
  const v = assessVerification(s, config)
  assert.equal(v.pass, false)
  assert.ok(v.blockers.some(x => /test/i.test(x)))
  assert.ok(v.blockers.some(x => /mutation/i.test(x)))
})

test('code with mutation and test evidence can pass', () => {
  const s = make('code', 'implement and fix this code')
  s.plan.forEach(item => item.status = 'done')
  s.observations.push(observation('apply_patch', 'updated src/plugin.ts'))
  s.observations.push(observation('shell_exec', 'npm test: 42 tests passed'))
  const v = assessVerification(s, config)
  assert.ok(v.score >= .62)
  assert.equal(v.pass, true)
})

test('research requires more than one distinct evidence outcome', () => {
  const s = make('research')
  s.observations.push(observation('web_search', 'one source'))
  s.observations.push(observation('web_search', 'one source', false, 'o-alt'))
  const v = assessVerification(s, config)
  assert.equal(v.pass, false)
  assert.ok(v.blockers.some(x => /distinct evidence/i.test(x)))
})

test('consecutive failures create blocker', () => {
  const s = make('analysis')
  s.budget.consecutiveToolFailures = 3
  const v = assessVerification(s, config)
  assert.ok(v.blockers.some(x => /consecutive/i.test(x)))
})

test('repeated identical outcomes are treated as stalled evidence', () => {
  const s = make('research')
  s.budget.currentRepeatedOutcomeRun = 4
  const v = assessVerification(s, config)
  assert.ok(v.blockers.some(x => /same observable outcome/i.test(x)))
})


test('read-only code review does not demand a fake mutation', () => {
  const s = make('code', 'explain this source code architecture')
  s.plan.forEach(item => item.status = 'done')
  s.observations.push(observation('read_file', 'actual source content'))
  const v = assessVerification(s, config)
  assert.equal(v.blockers.some(x => /mutation/i.test(x)), false)
})
