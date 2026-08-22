import z from '@deepseek-ai/schemastery'
import type { Config, ResolvedConfig, Strategy } from './types.js'
import { defaultStatePath } from './state.js'

const DEFAULT_VERIFY: Strategy[] = ['research', 'code', 'analysis', 'design', 'long-task']

export const ConfigSchema = z.object({
  enabled: z.boolean().default(true),
  persistentState: z.boolean().default(true),
  statePath: z.string().default(defaultStatePath()),
  strategyRouting: z.boolean().default(true),
  planning: z.boolean().default(true),
  contextInjection: z.boolean().default(true),
  contextLayering: z.boolean().default(true),
  contextRefreshEverySteps: z.number().default(4),
  contextMaxChars: z.number().default(7600),
  evidencePreviewChars: z.number().default(420),
  maxEvidenceItems: z.number().default(10),
  maxArchiveCheckpointItems: z.number().default(6),
  verification: z.boolean().default(true),
  verificationMinScore: z.number().default(0.64),
  maxVerificationRounds: z.number().default(2),
  reflection: z.boolean().default(true),
  reflectionErrorThreshold: z.number().default(2),
  reflectionFailureThreshold: z.number().default(2),
  maxReflectionRounds: z.number().default(2),
  livenessGuard: z.boolean().default(true),
  repeatedToolSoftRun: z.number().default(3),
  repeatedToolHardRun: z.number().default(8),
  maxStopSteers: z.number().default(3),
  maxSameEvidenceStopVisits: z.number().default(2),
  softMaxStepsPerTurn: z.number().default(18),
  hardMaxStepsPerTurn: z.number().default(28),
  maxToolCallsPerTurn: z.number().default(48),
  maxErrorsPerTurn: z.number().default(8),
  maxDurationMs: z.number().default(900000),
  maxNoProgressSteps: z.number().default(8),
  verifyStrategies: z.array(z.string()).default(DEFAULT_VERIFY),
  delegationHints: z.boolean().default(true),
  subagentIsolationHints: z.boolean().default(true),
  preferredCodeProviders: z.array(z.string()).default(['codex', 'claude-code']),
  preferredResearchProviders: z.array(z.string()).default(['spawn', 'fork']),
  telemetry: z.boolean().default(true),
})

export function resolveConfig(raw: Config): ResolvedConfig {
  const config: ResolvedConfig = {
    enabled: raw.enabled ?? true,
    persistentState: raw.persistentState ?? true,
    statePath: raw.statePath ?? defaultStatePath(),
    strategyRouting: raw.strategyRouting ?? true,
    planning: raw.planning ?? true,
    contextInjection: raw.contextInjection ?? true,
    contextLayering: raw.contextLayering ?? true,
    contextRefreshEverySteps: raw.contextRefreshEverySteps ?? 4,
    contextMaxChars: raw.contextMaxChars ?? 7600,
    evidencePreviewChars: raw.evidencePreviewChars ?? 420,
    maxEvidenceItems: raw.maxEvidenceItems ?? 10,
    maxArchiveCheckpointItems: raw.maxArchiveCheckpointItems ?? 6,
    verification: raw.verification ?? true,
    verificationMinScore: raw.verificationMinScore ?? 0.64,
    maxVerificationRounds: raw.maxVerificationRounds ?? 2,
    reflection: raw.reflection ?? true,
    reflectionErrorThreshold: raw.reflectionErrorThreshold ?? 2,
    reflectionFailureThreshold: raw.reflectionFailureThreshold ?? 2,
    maxReflectionRounds: raw.maxReflectionRounds ?? 2,
    livenessGuard: raw.livenessGuard ?? true,
    repeatedToolSoftRun: raw.repeatedToolSoftRun ?? 3,
    repeatedToolHardRun: raw.repeatedToolHardRun ?? 8,
    maxStopSteers: raw.maxStopSteers ?? 3,
    maxSameEvidenceStopVisits: raw.maxSameEvidenceStopVisits ?? 2,
    softMaxStepsPerTurn: raw.softMaxStepsPerTurn ?? 18,
    hardMaxStepsPerTurn: raw.hardMaxStepsPerTurn ?? 28,
    maxToolCallsPerTurn: raw.maxToolCallsPerTurn ?? 48,
    maxErrorsPerTurn: raw.maxErrorsPerTurn ?? 8,
    maxDurationMs: raw.maxDurationMs ?? 900000,
    maxNoProgressSteps: raw.maxNoProgressSteps ?? 8,
    verifyStrategies: (raw.verifyStrategies ?? DEFAULT_VERIFY) as Strategy[],
    delegationHints: raw.delegationHints ?? true,
    subagentIsolationHints: raw.subagentIsolationHints ?? true,
    preferredCodeProviders: raw.preferredCodeProviders ?? ['codex', 'claude-code'],
    preferredResearchProviders: raw.preferredResearchProviders ?? ['spawn', 'fork'],
    telemetry: raw.telemetry ?? true,
  }
  validateConfig(config)
  return config
}

export function validateConfig(config: ResolvedConfig): void {
  intAtLeast(config.contextRefreshEverySteps, 1, 'contextRefreshEverySteps')
  intAtLeast(config.contextMaxChars, 800, 'contextMaxChars')
  intAtLeast(config.evidencePreviewChars, 80, 'evidencePreviewChars')
  intAtLeast(config.maxEvidenceItems, 1, 'maxEvidenceItems')
  intAtLeast(config.maxArchiveCheckpointItems, 1, 'maxArchiveCheckpointItems')
  decimal(config.verificationMinScore, 0, 1, 'verificationMinScore')
  intAtLeast(config.maxVerificationRounds, 0, 'maxVerificationRounds')
  intAtLeast(config.reflectionErrorThreshold, 1, 'reflectionErrorThreshold')
  intAtLeast(config.reflectionFailureThreshold, 1, 'reflectionFailureThreshold')
  intAtLeast(config.maxReflectionRounds, 0, 'maxReflectionRounds')
  intAtLeast(config.repeatedToolSoftRun, 2, 'repeatedToolSoftRun')
  intAtLeast(config.repeatedToolHardRun, config.repeatedToolSoftRun + 1, 'repeatedToolHardRun')
  intAtLeast(config.maxStopSteers, 0, 'maxStopSteers')
  intAtLeast(config.maxSameEvidenceStopVisits, 1, 'maxSameEvidenceStopVisits')
  intAtLeast(config.softMaxStepsPerTurn, 1, 'softMaxStepsPerTurn')
  intAtLeast(config.hardMaxStepsPerTurn, config.softMaxStepsPerTurn + 1, 'hardMaxStepsPerTurn')
  intAtLeast(config.maxToolCallsPerTurn, 1, 'maxToolCallsPerTurn')
  intAtLeast(config.maxErrorsPerTurn, 1, 'maxErrorsPerTurn')
  intAtLeast(config.maxDurationMs, 1000, 'maxDurationMs')
  intAtLeast(config.maxNoProgressSteps, 1, 'maxNoProgressSteps')
  for (const strategy of config.verifyStrategies) {
    if (!['direct', 'research', 'code', 'analysis', 'design', 'long-task'].includes(strategy)) {
      throw new Error(`verifyStrategies contains unsupported strategy: ${strategy}`)
    }
  }
}

function intAtLeast(value: number, min: number, name: string): void {
  if (!Number.isSafeInteger(value) || value < min) throw new Error(`${name} must be an integer >= ${min}`)
}

function decimal(value: number, min: number, max: number, name: string): void {
  if (!Number.isFinite(value) || value < min || value > max) throw new Error(`${name} must be between ${min} and ${max}`)
}
