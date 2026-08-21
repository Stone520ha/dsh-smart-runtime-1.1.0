import type { RuntimeLogger, RuntimeState, VerificationAssessment } from './types.js';
export declare function logTurnState(logger: RuntimeLogger, state: RuntimeState): void;
export declare function logVerification(logger: RuntimeLogger, state: RuntimeState, assessment: VerificationAssessment): void;
export declare function logBudgetStop(logger: RuntimeLogger, state: RuntimeState, reasons: readonly string[]): void;
//# sourceMappingURL=telemetry.d.ts.map