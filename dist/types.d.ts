export type Strategy = 'direct' | 'research' | 'code' | 'analysis' | 'design' | 'long-task';
export type PlanStatus = 'pending' | 'active' | 'done' | 'blocked' | 'skipped';
export interface PlanItem {
    id: string;
    title: string;
    doneWhen: string;
    status: PlanStatus;
    evidenceIds: string[];
    note?: string;
}
export interface GoalState {
    objective: string;
    acceptanceCriteria: string[];
    constraints: string[];
    createdFrom: string;
    confidence: number;
}
export interface ToolObservation {
    id: string;
    turn: number;
    tool: string;
    callId: string;
    fingerprint: string;
    outcomeFingerprint: string;
    isError: boolean;
    summary: string;
    argumentPreview: string;
    resultPreview: string;
    stepHint?: number;
    at: number;
}
export interface Checkpoint {
    id: string;
    turn: number;
    kind: 'strategy' | 'context' | 'soft-budget' | 'hard-budget' | 'reflection' | 'verification' | 'convergence' | 'liveness' | 'delegation';
    step: number;
    note: string;
    at: number;
}
export interface BudgetState {
    startedAt: number;
    steps: number;
    toolCalls: number;
    errors: number;
    consecutiveToolFailures: number;
    maxRepeatedFingerprintRun: number;
    currentRepeatedFingerprintRun: number;
    lastFingerprint?: string;
    maxRepeatedOutcomeRun: number;
    currentRepeatedOutcomeRun: number;
    lastOutcomeFingerprint?: string;
    lastProgressStep: number;
}
/**
 * Durable loop-hygiene state. It intentionally tracks only externally observable
 * progress (steps, tools, plan completion and stop-boundary visits), never hidden
 * model reasoning.
 */
export interface LivenessState {
    stopBoundaryVisits: number;
    stopSteers: number;
    sameEvidenceStopVisits: number;
    lastStopToolCount?: number;
    lastStopPlanCompletion?: number;
    repeatedToolNoticeAtRun?: number;
    hardStallTrips: number;
    lastStopAt?: number;
}
export interface VerificationAssessment {
    score: number;
    pass: boolean;
    blockers: string[];
    warnings: string[];
    checklist: string[];
    evidenceCount: number;
    successfulEvidenceCount: number;
    failedEvidenceCount: number;
    planCompletion: number;
    requiresObservableAction: boolean;
}
export interface DelegationAdvice {
    availableProviders: string[];
    preferredProviders: string[];
    shouldConsiderDelegation: boolean;
    reason: string;
    isolationGuidance?: string;
}
export interface RuntimeState {
    version: 1;
    sessionId: string;
    turn: number;
    strategy: Strategy;
    prompt: string;
    promptHash: string;
    goal: GoalState;
    plan: PlanItem[];
    observations: ToolObservation[];
    checkpoints: Checkpoint[];
    budget: BudgetState;
    liveness: LivenessState;
    verificationRounds: number;
    reflectionRounds: number;
    softBudgetNoticeInjected: boolean;
    contextInjectionStep: number;
    verificationInjectedAtToolCount?: number;
    reflectionInjectedAtToolCount?: number;
    lastUpdatedAt: number;
}
export interface RuntimeSnapshotEvent {
    version: 1;
    turn: number;
    strategy: Strategy;
    promptHash: string;
    goal: GoalState;
    plan: PlanItem[];
    budget: BudgetState;
    /** Optional for backward compatibility with v1.0 snapshots. */
    liveness?: LivenessState;
    verificationRounds: number;
    reflectionRounds: number;
    softBudgetNoticeInjected: boolean;
    contextInjectionStep: number;
    verificationInjectedAtToolCount?: number;
    reflectionInjectedAtToolCount?: number;
    lastUpdatedAt: number;
}
export interface ObservationEvent {
    version: 1;
    observation: ToolObservation;
}
export interface CheckpointEvent {
    version: 1;
    checkpoint: Checkpoint;
}
export interface Config {
    enabled?: boolean;
    persistentState?: boolean;
    strategyRouting?: boolean;
    planning?: boolean;
    contextInjection?: boolean;
    contextLayering?: boolean;
    contextRefreshEverySteps?: number;
    contextMaxChars?: number;
    evidencePreviewChars?: number;
    maxEvidenceItems?: number;
    maxArchiveCheckpointItems?: number;
    verification?: boolean;
    verificationMinScore?: number;
    maxVerificationRounds?: number;
    reflection?: boolean;
    reflectionErrorThreshold?: number;
    reflectionFailureThreshold?: number;
    maxReflectionRounds?: number;
    livenessGuard?: boolean;
    repeatedToolSoftRun?: number;
    repeatedToolHardRun?: number;
    maxStopSteers?: number;
    maxSameEvidenceStopVisits?: number;
    softMaxStepsPerTurn?: number;
    hardMaxStepsPerTurn?: number;
    maxToolCallsPerTurn?: number;
    maxErrorsPerTurn?: number;
    maxDurationMs?: number;
    maxNoProgressSteps?: number;
    verifyStrategies?: Strategy[];
    delegationHints?: boolean;
    subagentIsolationHints?: boolean;
    preferredCodeProviders?: string[];
    preferredResearchProviders?: string[];
    telemetry?: boolean;
}
export interface ResolvedConfig {
    enabled: boolean;
    persistentState: boolean;
    strategyRouting: boolean;
    planning: boolean;
    contextInjection: boolean;
    contextLayering: boolean;
    contextRefreshEverySteps: number;
    contextMaxChars: number;
    evidencePreviewChars: number;
    maxEvidenceItems: number;
    maxArchiveCheckpointItems: number;
    verification: boolean;
    verificationMinScore: number;
    maxVerificationRounds: number;
    reflection: boolean;
    reflectionErrorThreshold: number;
    reflectionFailureThreshold: number;
    maxReflectionRounds: number;
    livenessGuard: boolean;
    repeatedToolSoftRun: number;
    repeatedToolHardRun: number;
    maxStopSteers: number;
    maxSameEvidenceStopVisits: number;
    softMaxStepsPerTurn: number;
    hardMaxStepsPerTurn: number;
    maxToolCallsPerTurn: number;
    maxErrorsPerTurn: number;
    maxDurationMs: number;
    maxNoProgressSteps: number;
    verifyStrategies: Strategy[];
    delegationHints: boolean;
    subagentIsolationHints: boolean;
    preferredCodeProviders: string[];
    preferredResearchProviders: string[];
    telemetry: boolean;
}
export interface SessionEventLike {
    type: string;
    seq: number;
    time: number;
    data: unknown;
}
export interface SessionLike {
    id: string;
    events: readonly SessionEventLike[];
    append(type: string, data: unknown): unknown;
}
export interface SubagentServiceLike {
    list(): string[];
}
export interface RuntimeLogger {
    debug?(message: string): void;
    info?(message: string): void;
    warn(message: string): void;
    error?(message: string): void;
}
//# sourceMappingURL=types.d.ts.map