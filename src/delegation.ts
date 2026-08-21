import type { DelegationAdvice, ResolvedConfig, Strategy, SubagentServiceLike } from './types.js'

export function discoverSubagentService(ctx: unknown): SubagentServiceLike | undefined {
  if (!ctx || typeof ctx !== 'object') return undefined
  const direct = (ctx as Record<string, unknown>).subagents
  if (direct && typeof direct === 'object' && typeof (direct as SubagentServiceLike).list === 'function') {
    return direct as SubagentServiceLike
  }
  const getter = (ctx as { get?: (name: string) => unknown }).get
  if (typeof getter === 'function') {
    try {
      const resolved = getter.call(ctx, 'subagents')
      if (resolved && typeof resolved === 'object' && typeof (resolved as SubagentServiceLike).list === 'function') {
        return resolved as SubagentServiceLike
      }
    } catch {
      // Optional service discovery should never break the parent agent.
    }
  }
  return undefined
}

export function delegationAdvice(
  strategy: Strategy,
  service: SubagentServiceLike | undefined,
  config: ResolvedConfig,
): DelegationAdvice {
  const availableProviders = safeList(service)
  if (!config.delegationHints || availableProviders.length === 0) {
    return {
      availableProviders,
      preferredProviders: [],
      shouldConsiderDelegation: false,
      reason: availableProviders.length === 0 ? 'No subagent provider is registered.' : 'Delegation hints are disabled.',
    }
  }

  const preferred = strategy === 'code'
    ? config.preferredCodeProviders
    : strategy === 'research' || strategy === 'long-task'
      ? config.preferredResearchProviders
      : []
  const preferredProviders = preferred.filter(name => availableProviders.includes(name))
  const complex = ['code', 'research', 'long-task'].includes(strategy)
  const shouldConsiderDelegation = complex && (preferredProviders.length > 0 || availableProviders.length > 0)

  let reason = 'Keep the task in the parent unless a child can own a self-contained work package.'
  if (shouldConsiderDelegation) {
    reason = preferredProviders.length > 0
      ? `Self-contained ${strategy} work may be delegated; preferred available providers: ${preferredProviders.join(', ')}.`
      : `Self-contained ${strategy} work may be delegated using an available provider.`
  }

  const isolationGuidance = config.subagentIsolationHints && shouldConsiderDelegation
    ? isolationRule(strategy)
    : undefined
  return {
    availableProviders,
    preferredProviders,
    shouldConsiderDelegation,
    reason,
    ...(isolationGuidance ? { isolationGuidance } : {}),
  }
}

function safeList(service: SubagentServiceLike | undefined): string[] {
  if (!service) return []
  try {
    return [...new Set(service.list().filter(Boolean))].sort()
  } catch {
    return []
  }
}

function isolationRule(strategy: Strategy): string {
  if (strategy === 'code') {
    return 'A child should receive a bounded coding objective and isolated context/workspace when the provider supports it. Do not let sibling write-capable agents edit the same working tree concurrently. The parent owns integration and final tests.'
  }
  if (strategy === 'research') {
    return 'Give each child a distinct evidence question or source domain. Keep raw exploration in the child and return only findings, citations/identifiers, uncertainty, and unresolved conflicts to the parent.'
  }
  return 'Delegate independent milestones with explicit inputs and expected outputs. Keep child scratch context isolated; the parent owns cross-workstream integration and final verification.'
}
