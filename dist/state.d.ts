import type { BudgetState, Checkpoint, GoalState, LivenessState, PlanItem, RuntimeSnapshotEvent, RuntimeState, SessionLike, Strategy, ToolObservation } from './types.js';
export declare const EVENT_SNAPSHOT = "smart-runtime/snapshot";
export declare const EVENT_OBSERVATION = "smart-runtime/observation";
export declare const EVENT_CHECKPOINT = "smart-runtime/checkpoint";
export declare function defaultStatePath(): string;
export interface FreshStateInput {
    sessionId: string;
    turn: number;
    prompt: string;
    strategy: Strategy;
    routeConfidence: number;
    planning: boolean;
}
export declare function createFreshState(input: FreshStateInput): RuntimeState;
export declare function freshBudget(startedAt?: number): BudgetState;
export declare function freshLiveness(): LivenessState;
export declare class StateRepository {
    private readonly persistent;
    private readonly cache;
    private readonly stored;
    private readonly statePath?;
    constructor(persistent: boolean, statePath?: string);
    get(session: SessionLike, turn: number): RuntimeState | undefined;
    initialize(session: SessionLike, input: FreshStateInput): RuntimeState;
    mutate(session: SessionLike, state: RuntimeState, mutator: (draft: RuntimeState) => void, persist?: boolean): RuntimeState;
    addObservation(session: SessionLike, state: RuntimeState, observation: ToolObservation, maxItems: number): void;
    addCheckpoint(session: SessionLike, state: RuntimeState, checkpoint: Checkpoint): void;
    saveSnapshot(session: SessionLike, state: RuntimeState): void;
    dispose(session: SessionLike): void;
    private putCache;
    private key;
    private load;
    private persist;
}
export declare function foldRuntimeState(session: SessionLike, turn: number): RuntimeState | undefined;
export declare function snapshotOf(state: RuntimeState): RuntimeSnapshotEvent;
export declare function cloneGoal(goal: GoalState): GoalState;
export declare function clonePlan(plan: readonly PlanItem[]): PlanItem[];
//# sourceMappingURL=state.d.ts.map