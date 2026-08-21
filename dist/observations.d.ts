import type { RuntimeState, ToolObservation } from './types.js';
export interface ToolExecutionLike {
    callId: string;
    name: string;
    arguments?: unknown;
}
export interface ToolResultLike {
    isError: boolean;
    content?: unknown;
    error?: {
        message?: string;
    };
    value?: unknown;
}
export declare function createObservation(state: RuntimeState, exec: ToolExecutionLike, result: ToolResultLike, previewChars: number): ToolObservation;
export declare function applyObservationToBudget(state: RuntimeState, observation: ToolObservation): void;
//# sourceMappingURL=observations.d.ts.map