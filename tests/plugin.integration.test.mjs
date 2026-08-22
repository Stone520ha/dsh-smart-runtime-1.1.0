import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const statePath = path.join(root, '.test-smart-runtime-state.json')
await fs.rm(statePath, { force: true })
const mockDir = path.join(root, 'node_modules', '@deepseek-ai', 'dsh-llm')
await fs.mkdir(mockDir, { recursive: true })
await fs.writeFile(path.join(mockDir, 'package.json'), JSON.stringify({ name:'@deepseek-ai/dsh-llm', type:'module', exports:'./index.js' }))
await fs.writeFile(path.join(mockDir, 'index.js'), `let n=0; export function createUserMessage(input){ return { id:'mock-'+(++n), role:'user', ...input } }\n`)

const schemaDir = path.join(root, 'node_modules', '@deepseek-ai', 'schemastery')
await fs.mkdir(schemaDir, { recursive: true })
await fs.writeFile(path.join(schemaDir, 'package.json'), JSON.stringify({ name:'@deepseek-ai/schemastery', type:'module', exports:'./index.js' }))
await fs.writeFile(path.join(schemaDir, 'index.js'), `const mk=()=>({default(){return this}}); const z={object(){return mk()},boolean:mk,number:mk,string:mk,array(){return mk()}}; export default z;
`)

const { applySmartRuntime } = await import('../dist/plugin.js')

class FakeSession {
  constructor(id='s1') { this.id=id; this.events=[] }
  append(type,data){ const e={type,seq:this.events.length,time:Date.now(),data:structuredClone(data)}; this.events.push(e); return e }
}

function makeContext() {
  const listeners = new Map()
  return {
    logger: { warn(){}, info(){}, debug(){} },
    subagents: { list: () => ['codex','claude-code'] },
    on(name, cb) { const list=listeners.get(name) ?? []; list.push(cb); listeners.set(name,list) },
    listeners,
  }
}

function baseConfig() {
  return {
    enabled:true,persistentState:true,statePath,strategyRouting:true,planning:true,contextInjection:true,
    contextLayering:true,contextRefreshEverySteps:4,contextMaxChars:7000,evidencePreviewChars:420,maxEvidenceItems:10,maxArchiveCheckpointItems:6,
    verification:true,verificationMinScore:.62,maxVerificationRounds:2,reflection:true,
    reflectionErrorThreshold:2,reflectionFailureThreshold:2,maxReflectionRounds:2,livenessGuard:true,repeatedToolSoftRun:3,repeatedToolHardRun:8,maxStopSteers:3,maxSameEvidenceStopVisits:2,
    softMaxStepsPerTurn:18,hardMaxStepsPerTurn:28,maxToolCallsPerTurn:48,maxErrorsPerTurn:8,
    maxDurationMs:900000,maxNoProgressSteps:8,verifyStrategies:['research','code','analysis','design','long-task'],
    delegationHints:true,subagentIsolationHints:true,preferredCodeProviders:['codex','claude-code'],preferredResearchProviders:['spawn','fork'],telemetry:false,
  }
}

test('plugin wires pre-step, sidecar persistence, tool observation and stop verification', async () => {
  const ctx = makeContext()
  applySmartRuntime(ctx, baseConfig())
  assert.ok(ctx.listeners.has('agent/pre-step'))
  assert.ok(ctx.listeners.has('tools/post-execute'))
  assert.ok(ctx.listeners.has('agent/turn-stopping'))

  const session = new FakeSession()
  const steered=[]
  const agent = { id:'s1', session, steer(message){ steered.push(message) } }
  const pre = ctx.listeners.get('agent/pre-step')[0]
  const userMessage = { id:'u1', role:'user', source:{kind:'user'}, content:[{type:'text',text:'修复这个 TypeScript 插件并运行测试'}] }
  const decision = await pre({agent,messages:[userMessage],turn:1,step:1,signal:new AbortController().signal}, async()=>({kind:'enter',messages:[userMessage]}))
  assert.equal(decision.kind,'enter')
  assert.ok(decision.messages.length >= 2)
  assert.equal(session.events.length, 0)

  const post = ctx.listeners.get('tools/post-execute')[0]
  await post(
    { agent, callId:'c1', name:'read_file', arguments:{path:'src/index.ts'} },
    { isError:false, value:{ok:true}, content:[{type:'text',text:'source file'}] },
    async()=>({kind:'accept'}),
  )
  assert.equal(session.events.length, 0)

  const stopping = ctx.listeners.get('agent/turn-stopping')[0]
  await stopping({agent,turn:1,signal:new AbortController().signal})
  assert.equal(steered.length, 1)
  assert.match(steered[0].content[0].text, /verification checkpoint/i)
})

test('hard budget rejects a later step through official pre-step decision', async () => {
  const ctx = makeContext()
  const config = baseConfig(); config.softMaxStepsPerTurn=2; config.hardMaxStepsPerTurn=3
  applySmartRuntime(ctx, config)
  const session = new FakeSession('s2')
  const agent = { id:'s2', session, steer(){} }
  const pre = ctx.listeners.get('agent/pre-step')[0]
  const user = { id:'u', role:'user', source:{kind:'user'}, content:[{type:'text',text:'debug code'}] }
  await pre({agent,messages:[user],turn:1,step:1,signal:new AbortController().signal}, async()=>({kind:'enter',messages:[user]}))
  const rejected = await pre({agent,messages:[],turn:1,step:4,signal:new AbortController().signal}, async()=>({kind:'enter',messages:[]}))
  assert.deepEqual(rejected,{kind:'reject'})
})

test('stop verification cannot self-loop forever without new evidence', async () => {
  const ctx = makeContext()
  const config = baseConfig()
  config.maxVerificationRounds = 10
  config.maxStopSteers = 10
  config.maxSameEvidenceStopVisits = 2
  applySmartRuntime(ctx, config)
  const session = new FakeSession('stop-bounded')
  const steered=[]
  const agent = { id:'stop-bounded', session, steer(message){ steered.push(message) } }
  const pre = ctx.listeners.get('agent/pre-step')[0]
  const user = { id:'u-stop', role:'user', source:{kind:'user'}, content:[{type:'text',text:'research current evidence and verify it'}] }
  await pre({agent,messages:[user],turn:1,step:1,signal:new AbortController().signal}, async()=>({kind:'enter',messages:[user]}))
  const stopping = ctx.listeners.get('agent/turn-stopping')[0]

  await stopping({agent,turn:1,signal:new AbortController().signal})
  assert.equal(steered.length,1)
  await stopping({agent,turn:1,signal:new AbortController().signal})
  assert.equal(steered.length,2)
  assert.match(steered[1].content[0].text,/liveness recovery/i)
  await stopping({agent,turn:1,signal:new AbortController().signal})
  assert.equal(steered.length,2)
  assert.equal(session.events.length, 0)
})

test('identical tool outcome replay is rejected through pre-step liveness guard', async () => {
  const ctx = makeContext()
  const config = baseConfig()
  config.repeatedToolSoftRun = 2
  config.repeatedToolHardRun = 3
  applySmartRuntime(ctx, config)
  const session = new FakeSession('stall')
  const agent = { id:'stall', session, steer(){} }
  const pre = ctx.listeners.get('agent/pre-step')[0]
  const post = ctx.listeners.get('tools/post-execute')[0]
  const user = { id:'u-stall', role:'user', source:{kind:'user'}, content:[{type:'text',text:'research this topic'}] }
  await pre({agent,messages:[user],turn:1,step:1,signal:new AbortController().signal}, async()=>({kind:'enter',messages:[user]}))

  for (let i=0;i<3;i++) {
    await post(
      {agent,callId:`c${i}`,name:'grep',arguments:{query:'same'}},
      {isError:false,value:'same',content:[{type:'text',text:'same result'}]},
      async()=>({kind:'accept'}),
    )
  }
  const rejected = await pre({agent,messages:[],turn:1,step:2,signal:new AbortController().signal}, async()=>({kind:'enter',messages:[]}))
  assert.deepEqual(rejected,{kind:'reject'})
})
