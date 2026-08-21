# dsh-smart-runtime 1.1 Architecture

## Principle

DSH official loop stays thin and authoritative:

```text
model → tools → model → ... → turn-stopping
```

Smart Runtime is a composable policy/state layer around it, not a replacement loop.

## Runtime graph

```text
User / Inbox
    │
    ▼
agent/pre-step
    │
    ├─ restore/create durable state
    ├─ strategy router
    ├─ goal + plan
    ├─ multi-dimensional budget
    ├─ liveness pre-check
    ├─ five-layer context projection
    └─ delegation/isolation guidance
    │
    ▼
Official DSH ReactLoopAgent
    │
    ▼
LLM → tool calls
    │
    ▼
tools/post-execute
    │
    ├─ action fingerprint
    ├─ outcome fingerprint
    ├─ world-state observation
    ├─ plan progress
    └─ failure/progress counters
    │
    ▼
next step or stop boundary
    │
    ▼
agent/turn-stopping
    │
    ├─ observe stop-boundary state
    ├─ conditional reflection
    ├─ evidence verifier
    ├─ liveness recovery
    ├─ bounded agent.steer()
    └─ converge when no new observable progress
```

## Context model

```text
L1 Stable Goal
    objective / acceptance criteria / constraints

L2 Active Plan
    milestones / current item / completion

L3 Working Evidence
    recent bounded tool observations

L4 Distilled State
    success/failure surfaces / repeated outcomes / blockers / recovery rounds

L5 Archive & Control
    budgets / stop state / checkpoints / delegation policy
```

This is a model-facing projection, not a reconstruction of hidden reasoning. Full transcript compaction remains a DSH compaction-plugin concern.

## Liveness model

Two independent repeat counters are maintained:

```text
same action            = tool + canonical arguments
same action + outcome  = action + result/error payload
```

The second is the stronger stall signal. A repeated action with changing results can be legitimate polling; an unchanged result replay is not credited as progress.

## Stop-boundary invariant

A plugin that can call `agent.steer()` at `agent/turn-stopping` must itself terminate.

Smart Runtime therefore guarantees bounded objections to termination with:

```text
maxStopSteers
maxSameEvidenceStopVisits
maxVerificationRounds
maxReflectionRounds
```

When the agent returns to the stop boundary with no new tool evidence and no plan-progress change, it receives at most bounded recovery opportunities. After the configured limit Smart Runtime records degraded convergence and permits DSH to close the turn.

## Verification model

Verification is deterministic evidence gating, not a hidden second model.

```text
code-change  → mutation evidence + checks/tests
code-read    → actual repository/source observation, no fake edit requirement
research     → multiple observations + distinct evidence outcomes
long-task    → milestone completion + execution evidence
all          → unresolved failure / repeated unchanged outcome checks
```

The original agent only gets another step when a material gap exists and liveness budget allows it.

## Subagent model

Smart Runtime does not own provider lifecycle. DSH `ctx.subagents` and official tool/provider packages do.

Smart Runtime supplies orchestration guidance:

```text
code child       bounded work package + isolated workspace/context where supported
research child   distinct evidence question/domain + isolated scratch context
parent           integration + conflict resolution + final verification
```

This keeps hidden cost, credentials and sandbox consequences out of an orchestration plugin.

## Provenance boundary

1. Codex-derived ideas are based on OpenAI's publicly released Codex CLI/runtime source and documentation.
2. Claude Code-derived ideas in 1.1 use official public behavior/docs plus public architectural analysis and public issue reports concerning the accidentally distributed source map.
3. No leaked proprietary Claude Code source files, source maps, prompts, credentials, or code fragments are copied into this package.
4. The implementation is independently written against DSH public extension contracts.
