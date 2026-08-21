declare module '@deepseek-ai/schemastery' {
  export interface Schema<T> {
    default(value: unknown): Schema<T>
  }
  interface Z {
    object<T>(value: unknown): Schema<T>
    boolean(): Schema<boolean>
    number(): Schema<number>
    string(): Schema<string>
    array<T>(value: Schema<T>): Schema<T[]>
  }
  const z: Z
  export default z
  export type { Schema as z }
}

declare module '@deepseek-ai/dsh-session/types' {
  interface SessionEventMap {}
}

declare module '@deepseek-ai/dsh-session' {
  export interface UserMessage {
    id?: string
    role?: string
    source: { kind: string; [key: string]: unknown }
    content: Array<{ type: string; text?: string; [key: string]: unknown }>
  }
  export interface Session {
    id: string
    events: readonly Array<{ type: string; seq: number; time: number; data: unknown }>[]
    append(type: string, data: unknown): unknown
  }
}

declare module '@deepseek-ai/dsh-llm' {
  import type { UserMessage } from '@deepseek-ai/dsh-session'
  export interface MessageSource { kind: string; [key: string]: unknown }
  export function createUserMessage(input: { content: Array<{ type: string; text: string }>; source: MessageSource }): UserMessage
}

declare module '@deepseek-ai/dsh-agent' {
  import type { UserMessage, Session } from '@deepseek-ai/dsh-session'
  export type PreStepDecision = { kind: 'reject' } | { kind: 'enter'; messages: UserMessage[] }
  export interface Agent {
    id: string
    session: Session
    steer(message: UserMessage): void
  }
}

declare module '@deepseek-ai/dsh-tools' {
  import type { Agent } from '@deepseek-ai/dsh-agent'
  import type { UserMessage } from '@deepseek-ai/dsh-session'
  export interface ToolExecution {
    agent?: Agent
    callId: string
    name: string
    arguments?: unknown
  }
  export interface ToolExecutionSuccess {
    isError: false
    value: unknown
    content: unknown[]
    additionalContexts?: UserMessage[]
  }
  export interface ToolExecutionFailure {
    isError: true
    error: { message: string }
    content: unknown[]
    additionalContexts?: UserMessage[]
  }
  export type ToolExecutionResult = ToolExecutionSuccess | ToolExecutionFailure
  export type PostToolDecision =
    | { kind: 'accept'; content?: unknown[]; value?: never; additionalContexts?: UserMessage[] }
    | { kind: 'accept'; value: unknown; content?: never; additionalContexts?: UserMessage[] }
    | { kind: 'block'; feedback: unknown[]; additionalContexts?: UserMessage[] }
}

declare module '@deepseek-ai/cordis' {
  import type { Agent, PreStepDecision } from '@deepseek-ai/dsh-agent'
  import type { UserMessage } from '@deepseek-ai/dsh-session'
  import type { PostToolDecision, ToolExecution, ToolExecutionResult } from '@deepseek-ai/dsh-tools'
  export interface Logger {
    debug?(message: string): void
    info?(message: string): void
    warn(message: string): void
    error?(message: string): void
  }
  export interface Context {
    logger: Logger
    subagents?: { list(): string[] }
    get?(name: string): unknown
    on(name: 'agent/pre-step', cb: (payload: { agent: Agent; messages: UserMessage[]; turn: number; step: number; signal: AbortSignal }, next: () => Promise<PreStepDecision>) => Promise<PreStepDecision>): void
    on(name: 'tools/post-execute', cb: (exec: ToolExecution, result: Readonly<ToolExecutionResult>, next: () => Promise<PostToolDecision>) => Promise<PostToolDecision>): void
    on(name: 'agent/error', cb: (payload: { agent: Agent; turn: number; step: number; error: unknown }) => void): void
    on(name: 'agent/turn-stopping', cb: (payload: { agent: Agent; turn: number; signal: AbortSignal }) => void | Promise<void>): void
    on(name: 'agent/disposed', cb: (payload: { agent: Agent }) => void): void
  }
}
