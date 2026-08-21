import test from 'node:test'
import assert from 'node:assert/strict'
import { createPlan, updatePlan, planCompletion, markPlanForReflection } from '../dist/planner.js'

function obs(overrides = {}) {
  return {
    id: 'o1', turn: 1, tool: 'shell_exec', callId: 'c1', fingerprint: 'f', isError: false,
    summary: 'done', argumentPreview: '', resultPreview: 'tests passed', at: Date.now(), ...overrides,
  }
}

test('code plan has multiple milestones', () => {
  const plan = createPlan('code')
  assert.ok(plan.length >= 5)
  assert.equal(plan[0].status, 'active')
})

test('successful execution advances matching plan', () => {
  const plan = createPlan('code')
  const next = updatePlan(plan, obs({ tool: 'read_file', resultPreview: 'package.json source' }))
  assert.ok(next.some(item => item.status === 'done'))
})

test('failed observation blocks a matching milestone', () => {
  const plan = createPlan('code')
  const next = updatePlan(plan, obs({ tool: 'shell_exec', isError: true, resultPreview: 'compile failed' }))
  assert.ok(next.some(item => item.status === 'blocked'))
})

test('reflection reopens a blocked milestone', () => {
  const plan = createPlan('code')
  plan[0].status = 'blocked'
  const next = markPlanForReflection(plan)
  assert.equal(next[0].status, 'active')
})

test('plan completion returns ratio', () => {
  const plan = createPlan('direct')
  assert.equal(planCompletion(plan), 0)
  plan[0].status = 'done'
  assert.equal(planCompletion(plan), 1)
})
