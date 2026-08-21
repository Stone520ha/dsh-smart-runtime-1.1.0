import test from 'node:test'
import assert from 'node:assert/strict'
import { createFreshState } from '../dist/state.js'
import { applyObservationToBudget } from '../dist/observations.js'
import { evaluateLivenessPreStep, observeStopBoundary, recordStopSteer, shouldAllowDegradedConvergence } from '../dist/liveness.js'

const config = {
  livenessGuard:true,repeatedToolSoftRun:3,repeatedToolHardRun:5,maxStopSteers:3,maxSameEvidenceStopVisits:2,
}
function state() { return createFreshState({sessionId:'s',turn:1,prompt:'task',strategy:'research',routeConfidence:1,planning:true}) }
function obs(i, fingerprint='same', outcomeFingerprint='same-outcome') {
  return {id:`o${i}`,turn:1,tool:'grep',callId:`c${i}`,fingerprint,outcomeFingerprint,isError:false,summary:'',argumentPreview:'x',resultPreview:'same result',at:Date.now()}
}

test('repeated identical action gets a soft anti-stall notice', () => {
  const s=state(); s.budget.steps=3
  for(let i=1;i<=3;i++) applyObservationToBudget(s,obs(i))
  const d=evaluateLivenessPreStep(s,config)
  assert.equal(d.kind,'soft')
})

test('repeated identical action and outcome eventually hard-stops', () => {
  const s=state(); s.budget.steps=5
  for(let i=1;i<=5;i++) applyObservationToBudget(s,obs(i))
  const d=evaluateLivenessPreStep(s,config)
  assert.equal(d.kind,'hard')
})

test('same action with changing outcomes is not hard-stalled', () => {
  const s=state(); s.budget.steps=6
  for(let i=1;i<=6;i++) applyObservationToBudget(s,obs(i,'same',`outcome-${i}`))
  const d=evaluateLivenessPreStep(s,config)
  assert.notEqual(d.kind,'hard')
})

test('repeated stop boundary without new evidence converges after bounded steers', () => {
  const s=state()
  observeStopBoundary(s)
  recordStopSteer(s)
  observeStopBoundary(s)
  recordStopSteer(s)
  assert.equal(shouldAllowDegradedConvergence(s,config),false)
  observeStopBoundary(s)
  assert.equal(shouldAllowDegradedConvergence(s,config),true)
})
