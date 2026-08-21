import type { Strategy } from './types.js';
interface RouteScore {
    strategy: Strategy;
    score: number;
}
export interface RouteResult {
    strategy: Strategy;
    confidence: number;
    scores: RouteScore[];
}
export declare function classifyStrategy(input: string): Strategy;
export declare function routeStrategy(input: string): RouteResult;
export declare function strategyInstruction(strategy: Strategy): string;
export {};
//# sourceMappingURL=router.d.ts.map