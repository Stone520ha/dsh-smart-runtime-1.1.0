import { createHash } from 'node:crypto'

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function now(): number {
  return Date.now()
}

export function hashText(value: string): string {
  return createHash('sha1').update(value).digest('hex').slice(0, 16)
}

export function stableJson(value: unknown): string {
  return JSON.stringify(sortJson(value))
}

function sortJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortJson)
  if (value !== null && typeof value === 'object') {
    const record = value as Record<string, unknown>
    const out: Record<string, unknown> = {}
    for (const key of Object.keys(record).sort()) out[key] = sortJson(record[key])
    return out
  }
  return value
}

export function preview(value: string, maxChars: number): string {
  const compact = value.replace(/\s+/g, ' ').trim()
  if (compact.length <= maxChars) return compact
  return `${compact.slice(0, Math.max(0, maxChars - 24))}… (+${compact.length - maxChars} chars)`
}

export function safeString(value: unknown): string {
  try {
    if (typeof value === 'string') return value
    return stableJson(value)
  } catch {
    try {
      return String(value)
    } catch {
      return '<unprintable>'
    }
  }
}

export function unique<T>(values: readonly T[]): T[] {
  return [...new Set(values)]
}

export function compactWhitespace(value: string): string {
  return value.replace(/\r\n/g, '\n').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim()
}

export function splitSentences(value: string): string[] {
  return compactWhitespace(value)
    .split(/(?:\n+|(?<=[。！？!?])\s*|(?<=\.)\s+(?=[A-Z0-9]))/u)
    .map(item => item.trim())
    .filter(Boolean)
}

export function normalizeToolName(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9_\-.:/]/g, '')
}

export function isLikelyTestTool(name: string, text: string): boolean {
  const n = normalizeToolName(name)
  const t = text.toLowerCase()
  return /(?:test|pytest|jest|vitest|cargo|check|lint|typecheck|build|compile|terminal|shell|exec|run_code)/.test(n)
    && /(?:pass|passed|success|ok|0 failed|0 errors|build complete|compiled|tests?)/.test(t)
}

export function isLikelyResearchTool(name: string): boolean {
  const n = normalizeToolName(name)
  return /(?:search|web|browser|fetch|http|read_url|crawl|query)/.test(n)
}

export function isLikelyFileTool(name: string): boolean {
  const n = normalizeToolName(name)
  return /(?:file|read|write|edit|patch|repo|git|grep|find|ls)/.test(n)
}



export function isCodeChangeRequest(text: string): boolean {
  return /(?:修复|修改|改造|实现|新增|添加|删除|重构|升级|优化|写代码|写一个|开发|安装包|插件|fix|change|modify|implement|add|remove|refactor|upgrade|optimi[sz]e|write|build|create|develop|patch)/i.test(text)
}

export function isLikelyMutationTool(name: string, argumentsText = '', resultText = ''): boolean {
  const n = normalizeToolName(name)
  const text = `${argumentsText} ${resultText}`.toLowerCase()
  if (/(?:write|edit|patch|apply_patch|replace|create_file|delete|rename|move|git_apply)/.test(n)) return true
  if (/(?:shell|terminal|exec|bash|command)/.test(n)) {
    return /(?:cat\s*>|tee\s+|sed\s+-i|perl\s+-pi|mv\s+|cp\s+|rm\s+|git\s+apply|patch\s+-p|python.+write_text|node.+writefile)/.test(text)
  }
  return false
}

export function isLikelyExecutionTool(name: string): boolean {
  const n = normalizeToolName(name)
  return /(?:shell|terminal|exec|run|code|command|python|node|bash|cargo|npm|pnpm|yarn)/.test(n)
}

export function scoreRatio(part: number, total: number): number {
  if (total <= 0) return 0
  return clamp(part / total, 0, 1)
}
