export declare function clamp(value: number, min: number, max: number): number;
export declare function now(): number;
export declare function hashText(value: string): string;
export declare function stableJson(value: unknown): string;
export declare function preview(value: string, maxChars: number): string;
export declare function safeString(value: unknown): string;
export declare function unique<T>(values: readonly T[]): T[];
export declare function compactWhitespace(value: string): string;
export declare function splitSentences(value: string): string[];
export declare function normalizeToolName(name: string): string;
export declare function isLikelyTestTool(name: string, text: string): boolean;
export declare function isLikelyResearchTool(name: string): boolean;
export declare function isLikelyFileTool(name: string): boolean;
export declare function isCodeChangeRequest(text: string): boolean;
export declare function isLikelyMutationTool(name: string, argumentsText?: string, resultText?: string): boolean;
export declare function isLikelyExecutionTool(name: string): boolean;
export declare function scoreRatio(part: number, total: number): number;
//# sourceMappingURL=util.d.ts.map