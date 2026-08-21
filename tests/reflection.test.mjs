import test from 'node:test'
import assert from 'node:assert/strict'
import { createFreshState } from '../dist/state.js'
import { reflectionTrigger, prepareReflection } from '../dist/reflection.js'

const config = { reflection:true, maxReflectionRounds:2, reflectionErrorThreshold:2, reflectionFailureThreshold:2, maxNoProgressSteps:8 }

test('reflection triggers on repeated failures', () => {
  const s = createFreshState({ sessionId:'s', turn:1, prompt:'x', strategy:'code', routeConfidence:1, planning:true })
  s.budget.consecutiveToolFailures = 2
  const r = reflectionTrigger(s, config)
  assert.equal(r.triggered, true)
})

test('reflection respects max rounds', () => {
  const s = createFreshState({ sessionId:'s', turn:1, prompt:'x', strategy:'code', routeConfidence:1, planning:true })
  s.reflectionRounds = 2
  s.budget.errors = 5
  assert.equal(reflectionTrigger(s, config).triggered, false)
})

test('prepare reflection increments round', () => {
  const s = createFreshState({ sessionId:'s', turn:1, prompt:'x', strategy:'code', routeConfidence:1, planning:true })
  prepareReflection(s)
  assert.equal(s.reflectionRounds, 1)
  assert.equal(s.reflectionInjectedAtToolCount, 0)
})
