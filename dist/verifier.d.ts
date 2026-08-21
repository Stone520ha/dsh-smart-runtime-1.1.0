import type { ResolvedConfig, RuntimeState, VerificationAssessment } from './types.js';
export declare function assessVerification(state: RuntimeState, config: ResolvedConfig): VerificationAssessment;
export declare function verificationPrompt(state: RuntimeState, assessment: VerificationAssessment): string;
export declare function shouldRunVerification(state: RuntimeState, config: ResolvedConfig): boolean;
//# sourceMappingURL=verifier.d.ts.map