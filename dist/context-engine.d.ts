import type { DelegationAdvice, ResolvedConfig, RuntimeState, ToolObservation } from './types.js';
export declare function shouldInjectContext(state: RuntimeState, step: number, config: ResolvedConfig): boolean;
/**
 * Five-layer bounded context projection inspired by production coding-agent
 * context stacks, but implemented only from DSH-observable durable state.
 * No hidden reasoning or proprietary prompt material is reconstructed.
 */
export declare function buildRuntimeContext(state: RuntimeState, config: ResolvedConfig, delegation?: DelegationAdvice): string;
export declare function summarizeEvidence(observations: readonly ToolObservation[]): string[];
export declare function capContext(text: string, maxChars: number): string;
//# sourceMappingURL=context-engine.d.ts.map