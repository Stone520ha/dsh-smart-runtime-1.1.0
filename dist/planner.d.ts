import type { PlanItem, Strategy, ToolObservation } from './types.js';
export declare function createPlan(strategy: Strategy): PlanItem[];
export declare function updatePlan(plan: readonly PlanItem[], observation: ToolObservation): PlanItem[];
export declare function markPlanForReflection(plan: readonly PlanItem[]): PlanItem[];
export declare function planCompletion(plan: readonly PlanItem[]): number;
//# sourceMappingURL=planner.d.ts.map