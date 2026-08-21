import type { ResolvedConfig, RuntimeState } from './types.js';
export interface ReflectionTrigger {
    triggered: boolean;
    reasons: string[];
}
export declare function reflectionTrigger(state: RuntimeState, config: ResolvedConfig): ReflectionTrigger;
export declare function prepareReflection(state: RuntimeState): void;
export declare function reflectionPrompt(state: RuntimeState, reasons: readonly string[]): string;
//# sourceMappingURL=reflection.d.ts.map