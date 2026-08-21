import test from 'node:test'
import assert from 'node:assert/strict'
import { StateRepository, foldRuntimeState } from '../dist/state.js'
import { createObservation, applyObservationToBudget } from '../dist/observations.js'

class FakeSession {
  constructor(id='session-1') { this.id = id; this.events = [] }
  append(type, data) { const event = { type, seq: this.events.length, time: Date.now(), data: structuredClone(data) }; this.events.push(event); return event }
}

test('state persists and folds from custom session events', () => {
  const session = new FakeSession()
  const repo = new StateRepository(true)
  const state = repo.initialize(session, { sessionId: session.id, turn: 1, prompt: 'research competitors', strategy: 'research', routeConfidence: .8, planning: true })
  state.budget.steps = 3
  repo.saveSnapshot(session, state)
  const folded = foldRuntimeState(session, 1)
  assert.equal(folded.strategy, 'research')
  assert.equal(folded.budget.steps, 3)
})

test('observation persists and survives fold', () => {
  const session = new FakeSession()
  const repo = new StateRepository(true)
  const state = repo.initialize(session, { sessionId: session.id, turn: 2, prompt: 'fix code', strategy: 'code', routeConfidence: .9, planning: true })
  const observation = createObservation(state, { callId: '1', name: 'shell_exec', arguments: { cmd: 'npm test' } }, { isError: false, content: [{ text: 'tests passed' }] }, 200)
  applyObservationToBudget(state, observation)
  repo.addObservation(session, state, observation, 20)
  const folded = foldRuntimeState(session, 2)
  assert.equal(folded.observations.length, 1)
  assert.equal(folded.observations[0].tool, 'shell_exec')
  assert.equal(folded.budget.toolCalls, 1)
})

test('non-persistent repository keeps memory cache without session events', () => {
  const session = new FakeSession()
  const repo = new StateRepository(false)
  const state = repo.initialize(session, { sessionId: session.id, turn: 1, prompt: 'hello', strategy: 'direct', routeConfidence: 1, planning: false })
  assert.equal(session.events.length, 0)
  assert.equal(repo.get(session, 1), state)
})

test('v1.0 observation snapshots migrate an outcome fingerprint on fold', () => {
  const session = new FakeSession('legacy')
  const repository = new StateRepository(true)
  const state = repository.initialize(session,{sessionId:'legacy',turn:1,prompt:'research x',strategy:'research',routeConfidence:.9,planning:true})
  const legacy = { id:'legacy-o',turn:1,tool:'web_search',callId:'c',fingerprint:'f',isError:false,summary:'ok',argumentPreview:'q',resultPreview:'result',at:Date.now() }
  session.append('smart-runtime/observation',{version:1,observation:legacy})
  repository.dispose(session)
  const folded = repository.get(session,1)
  assert.equal(typeof folded.observations.at(-1).outcomeFingerprint,'string')
  assert.ok(folded.observations.at(-1).outcomeFingerprint.length > 0)
  void state
})
