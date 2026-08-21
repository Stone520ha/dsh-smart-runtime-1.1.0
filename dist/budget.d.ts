import type { ResolvedConfig, RuntimeState } from './types.js';
export type BudgetDecision = {
    kind: 'continue';
} | {
    kind: 'soft';
    reasons: string[];
} | {
    kind: 'hard';
    reasons: string[];
};
export declare function updateStepBudget(state: RuntimeState, step: number): void;
export declare function recordAgentError(state: RuntimeState): void;
export declare function evaluateBudget(state: RuntimeState, config: ResolvedConfig, at?: number): BudgetDecision;
export declare function convergencePrompt(state: RuntimeState, reasons: readonly string[]): string;
//# sourceMappingURL=budget.d.ts.map