import type {
  BudgetState,
  Checkpoint,
  CheckpointEvent,
  GoalState,
  LivenessState,
  ObservationEvent,
  PlanItem,
  RuntimeSnapshotEvent,
  RuntimeState,
  SessionLike,
  Strategy,
  ToolObservation,
} from './types.js'
import { createGoal } from './goal.js'
import { createPlan, updatePlan } from './planner.js'
import { hashText, now } from './util.js'

export const EVENT_SNAPSHOT = 'smart-runtime/snapshot'
export const EVENT_OBSERVATION = 'smart-runtime/observation'
export const EVENT_CHECKPOINT = 'smart-runtime/checkpoint'

export interface FreshStateInput {
  sessionId: string
  turn: number
  prompt: string
  strategy: Strategy
  routeConfidence: number
  planning: boolean
}

export function createFreshState(input: FreshStateInput): RuntimeState {
  const at = now()
  return {
    version: 1,
    sessionId: input.sessionId,
    turn: input.turn,
    strategy: input.strategy,
    prompt: input.prompt,
    promptHash: hashText(input.prompt),
    goal: createGoal(input.prompt, input.strategy, input.routeConfidence),
    plan: input.planning ? createPlan(input.strategy) : [],
    observations: [],
    checkpoints: [],
    budget: freshBudget(at),
    liveness: freshLiveness(),
    verificationRounds: 0,
    reflectionRounds: 0,
    softBudgetNoticeInjected: false,
    contextInjectionStep: 0,
    lastUpdatedAt: at,
  }
}

export function freshBudget(startedAt = now()): BudgetState {
  return {
    startedAt,
    steps: 0,
    toolCalls: 0,
    errors: 0,
    consecutiveToolFailures: 0,
    maxRepeatedFingerprintRun: 0,
    currentRepeatedFingerprintRun: 0,
    maxRepeatedOutcomeRun: 0,
    currentRepeatedOutcomeRun: 0,
    lastProgressStep: 0,
  }
}

export function freshLiveness(): LivenessState {
  return {
    stopBoundaryVisits: 0,
    stopSteers: 0,
    sameEvidenceStopVisits: 0,
    hardStallTrips: 0,
  }
}

export class StateRepository {
  private readonly cache = new WeakMap<object, Map<number, RuntimeState>>()

  constructor(private readonly persistent: boolean) {}

  get(session: SessionLike, turn: number): RuntimeState | undefined {
    const cached = this.cache.get(session as object)?.get(turn)
    if (cached) return cached
    const folded = foldRuntimeState(session, turn)
    if (folded) this.putCache(session, turn, folded)
    return folded
  }

  initialize(session: SessionLike, input: FreshStateInput): RuntimeState {
    const existing = this.get(session, input.turn)
    if (existing) return existing
    const state = createFreshState(input)
    this.putCache(session, input.turn, state)
    this.saveSnapshot(session, state)
    return state
  }

  mutate(session: SessionLike, state: RuntimeState, mutator: (draft: RuntimeState) => void, persist = true): RuntimeState {
    mutator(state)
    state.lastUpdatedAt = now()
    this.putCache(session, state.turn, state)
    if (persist) this.saveSnapshot(session, state)
    return state
  }

  addObservation(session: SessionLike, state: RuntimeState, observation: ToolObservation, maxItems: number): void {
    state.observations.push(observation)
    if (state.observations.length > maxItems) state.observations.splice(0, state.observations.length - maxItems)
    state.plan = updatePlan(state.plan, observation)
    state.lastUpdatedAt = now()
    this.putCache(session, state.turn, state)
    if (this.persistent) {
      appendEvent(session, EVENT_OBSERVATION, { version: 1, observation } satisfies ObservationEvent)
      this.saveSnapshot(session, state)
    }
  }

  addCheckpoint(session: SessionLike, state: RuntimeState, checkpoint: Checkpoint): void {
    state.checkpoints.push(checkpoint)
    if (state.checkpoints.length > 64) state.checkpoints.splice(0, state.checkpoints.length - 64)
    state.lastUpdatedAt = now()
    this.putCache(session, state.turn, state)
    if (this.persistent) {
      appendEvent(session, EVENT_CHECKPOINT, { version: 1, checkpoint } satisfies CheckpointEvent)
      this.saveSnapshot(session, state)
    }
  }

  saveSnapshot(session: SessionLike, state: RuntimeState): void {
    if (!this.persistent) return
    appendEvent(session, EVENT_SNAPSHOT, snapshotOf(state))
  }

  dispose(session: SessionLike): void {
    this.cache.delete(session as object)
  }

  private putCache(session: SessionLike, turn: number, state: RuntimeState): void {
    let byTurn = this.cache.get(session as object)
    if (!byTurn) {
      byTurn = new Map()
      this.cache.set(session as object, byTurn)
    }
    byTurn.set(turn, state)
    if (byTurn.size > 6) {
      const oldest = [...byTurn.keys()].sort((a, b) => a - b)[0]
      if (oldest !== undefined) byTurn.delete(oldest)
    }
  }
}

export function foldRuntimeState(session: SessionLike, turn: number): RuntimeState | undefined {
  let snapshot: RuntimeSnapshotEvent | undefined
  const observations: ToolObservation[] = []
  const checkpoints: Checkpoint[] = []

  for (const event of session.events) {
    if (event.type === EVENT_SNAPSHOT && isSnapshotEvent(event.data) && event.data.turn === turn) {
      snapshot = structuredClone(event.data)
    } else if (event.type === EVENT_OBSERVATION && isObservationEvent(event.data) && event.data.observation.turn === turn) {
      observations.push(normalizeObservation(structuredClone(event.data.observation)))
    } else if (event.type === EVENT_CHECKPOINT && isCheckpointEvent(event.data) && event.data.checkpoint.turn === turn) {
      checkpoints.push(structuredClone(event.data.checkpoint))
    }
  }

  if (!snapshot) return undefined
  const state: RuntimeState = {
    version: 1,
    sessionId: session.id,
    turn: snapshot.turn,
    strategy: snapshot.strategy,
    prompt: '',
    promptHash: snapshot.promptHash,
    goal: structuredClone(snapshot.goal),
    plan: structuredClone(snapshot.plan),
    observations,
    checkpoints,
    budget: normalizeBudget(structuredClone(snapshot.budget)),
    liveness: snapshot.liveness ? structuredClone(snapshot.liveness) : freshLiveness(),
    verificationRounds: snapshot.verificationRounds,
    reflectionRounds: snapshot.reflectionRounds,
    softBudgetNoticeInjected: snapshot.softBudgetNoticeInjected,
    contextInjectionStep: snapshot.contextInjectionStep,
    ...(snapshot.verificationInjectedAtToolCount === undefined ? {} : { verificationInjectedAtToolCount: snapshot.verificationInjectedAtToolCount }),
    ...(snapshot.reflectionInjectedAtToolCount === undefined ? {} : { reflectionInjectedAtToolCount: snapshot.reflectionInjectedAtToolCount }),
    lastUpdatedAt: snapshot.lastUpdatedAt,
  }
  return state
}

export function snapshotOf(state: RuntimeState): RuntimeSnapshotEvent {
  return {
    version: 1,
    turn: state.turn,
    strategy: state.strategy,
    promptHash: state.promptHash,
    goal: structuredClone(state.goal),
    plan: structuredClone(state.plan),
    budget: structuredClone(state.budget),
    liveness: structuredClone(state.liveness),
    verificationRounds: state.verificationRounds,
    reflectionRounds: state.reflectionRounds,
    softBudgetNoticeInjected: state.softBudgetNoticeInjected,
    contextInjectionStep: state.contextInjectionStep,
    ...(state.verificationInjectedAtToolCount === undefined ? {} : { verificationInjectedAtToolCount: state.verificationInjectedAtToolCount }),
    ...(state.reflectionInjectedAtToolCount === undefined ? {} : { reflectionInjectedAtToolCount: state.reflectionInjectedAtToolCount }),
    lastUpdatedAt: state.lastUpdatedAt,
  }
}


function normalizeObservation(observation: ToolObservation): ToolObservation {
  const legacy = observation as ToolObservation & { outcomeFingerprint?: string }
  if (legacy.outcomeFingerprint) return observation
  return {
    ...observation,
    outcomeFingerprint: hashText(`${observation.fingerprint}\n${observation.isError ? 'ERR' : 'OK'}\n${observation.resultPreview}`),
  }
}

function normalizeBudget(budget: BudgetState): BudgetState {
  const legacy = budget as BudgetState & { maxRepeatedOutcomeRun?: number; currentRepeatedOutcomeRun?: number }
  return {
    ...budget,
    maxRepeatedOutcomeRun: legacy.maxRepeatedOutcomeRun ?? 0,
    currentRepeatedOutcomeRun: legacy.currentRepeatedOutcomeRun ?? 0,
  }
}

function appendEvent(session: SessionLike, type: string, data: unknown): void {
  session.append(type, data)
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isSnapshotEvent(value: unknown): value is RuntimeSnapshotEvent {
  if (!isObject(value)) return false
  return value.version === 1
    && typeof value.turn === 'number'
    && typeof value.strategy === 'string'
    && typeof value.promptHash === 'string'
    && isObject(value.goal)
    && Array.isArray(value.plan)
    && isObject(value.budget)
}

function isObservationEvent(value: unknown): value is ObservationEvent {
  return isObject(value) && value.version === 1 && isObject(value.observation)
}

function isCheckpointEvent(value: unknown): value is CheckpointEvent {
  return isObject(value) && value.version === 1 && isObject(value.checkpoint)
}

export function cloneGoal(goal: GoalState): GoalState {
  return structuredClone(goal)
}

export function clonePlan(plan: readonly PlanItem[]): PlanItem[] {
  return structuredClone([...plan])
}
