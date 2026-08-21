import type { DelegationAdvice, ResolvedConfig, Strategy, SubagentServiceLike } from './types.js';
export declare function discoverSubagentService(ctx: unknown): SubagentServiceLike | undefined;
export declare function delegationAdvice(strategy: Strategy, service: SubagentServiceLike | undefined, config: ResolvedConfig): DelegationAdvice;
//# sourceMappingURL=delegation.d.ts.map