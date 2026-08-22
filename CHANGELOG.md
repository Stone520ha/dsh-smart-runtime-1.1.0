# Changelog

## 1.1.1 - 2026-08-22

- Fixed dependency ranges for the current public DSH `0.1.1-rc.2` runtime, Cordis `4.0.1`, and Schemastery `3.18.1`.
- Declared the required `subagents` service injection in `cordis.patch.yml` so fresh profile installation succeeds.
- Added the missing TypeScript development toolchain and a portable Node type path so checks and builds work after a clean clone.
- Verified the packaged plugin against a single DSH instance with 44 unit/integration tests and a live lifecycle smoke test.

## 1.1.0 - 2026-08-20

- Added anti-stall liveness subsystem.
- Added independent action fingerprint and action+outcome fingerprint tracking.
- Repeated identical successful results no longer count as observable progress.
- Added soft repeated-action warning and hard unchanged-outcome stop through official pre-step reject.
- Added durable stop-boundary state and bounded `agent.steer()` behavior to prevent verifier/reflection self-loops.
- Added liveness recovery prompt that requires one concrete evidence-producing action or an explicit blocker.
- Added five-layer bounded context projection: stable goal, active plan, working evidence, distilled state, archive/control.
- Strengthened code verification with real mutation evidence and check/test evidence for mutation requests.
- Added read-only code-task handling so source analysis is not forced to mutate files.
- Strengthened research verification by requiring distinct evidence outcomes rather than repeated identical search results.
- Added subagent isolation guidance for coding and research child tasks.
- Added v1.0 observation migration for missing outcome fingerprints.
- Added public-issue-driven integration tests for repeated tool output and stop-boundary loops.
- No proprietary leaked Claude Code source was copied or redistributed.

## 1.0.0 - 2026-08-20

- Replaced the 0.1 single-file orchestration skeleton with modular runtime architecture.
- Added durable Session-backed runtime snapshots, observations and checkpoints.
- Added goal extraction and explicit acceptance criteria.
- Added strategy-specific milestone planning and observation-driven progress updates.
- Added bounded world-state context injection.
- Added step/tool/error/duration/no-progress budgets.
- Added conditional reflection with repeat protection.
- Added evidence-oriented final verification with bounded steer rounds.
- Added subagent provider discovery and strategy-aware delegation hints for Codex/Claude Code integrations.
- Added 34 unit/integration tests including mocked dsh lifecycle hooks.
- Kept `@deepseek-ai/dsh-agent-loop` untouched; all behavior remains plugin-based.
