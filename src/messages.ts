export interface MessageBlockLike {
  type?: string
  text?: string
}

export interface UserMessageLike {
  source?: { kind?: string }
  content?: MessageBlockLike[]
}

export function textOfUserMessages(messages: readonly UserMessageLike[]): string {
  const chunks: string[] = []
  for (const message of messages) {
    if (message.source?.kind !== 'user') continue
    for (const part of message.content ?? []) {
      if (part.type === 'text' && typeof part.text === 'string') chunks.push(part.text)
    }
  }
  return chunks.join('\n').trim()
}

export function hasRealUserMessage(messages: readonly UserMessageLike[]): boolean {
  return messages.some(message => message.source?.kind === 'user')
}
