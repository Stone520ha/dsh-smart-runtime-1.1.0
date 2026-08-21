export interface MessageBlockLike {
    type?: string;
    text?: string;
}
export interface UserMessageLike {
    source?: {
        kind?: string;
    };
    content?: MessageBlockLike[];
}
export declare function textOfUserMessages(messages: readonly UserMessageLike[]): string;
export declare function hasRealUserMessage(messages: readonly UserMessageLike[]): boolean;
//# sourceMappingURL=messages.d.ts.map