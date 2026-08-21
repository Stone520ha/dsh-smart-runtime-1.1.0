import type { ResolvedConfig, RuntimeState, VerificationAssessment } from './types.js';
export type LivenessPreStepDecision = {
    kind: 'continue';
} | {
    kind: 'soft';
    reason: string;
} | {
    kind: 'hard';
    reason: string;
};
export interface StopBoundaryObservation {
    sameEvidence: boolean;
    samePlanProgress: boolean;
    sameState: boolean;
}
export declare function evaluateLivenessPreStep(state: RuntimeState, config: ResolvedConfig): LivenessPreStepDecision;
export declare function observeStopBoundary(state: RuntimeState): StopBoundaryObservation;
export declare function maySteerAtStop(state: RuntimeState, config: ResolvedConfig): boolean;
export declare function recordStopSteer(state: RuntimeState): void;
export declare function shouldAllowDegradedConvergence(state: RuntimeState, config: ResolvedConfig): boolean;
export declare function livenessRecoveryPrompt(state: RuntimeState, assessment: VerificationAssessment, reason: string): string;
export declare function repeatedToolPrompt(state: RuntimeState, reason: string): string;
//# sourceMappingURL=liveness.d.ts.map