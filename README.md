# dsh-smart-runtime 1.1.1

一个遵循 DeepSeek Harness（dsh）“Everything is a Plugin”原则的 Smart Runtime 插件。它**不 fork `@deepseek-ai/dsh-agent-loop`**，而是在官方 `agent/*`、`tools/*`、Session event 扩展点上增强目标管理、上下文、验证、反思和防卡死能力。

## 1.1.1 兼容性修复

`1.1.1` 修正了 `1.1.0` 的两个安装问题：

- 依赖范围已对齐当前公开的 DSH `0.1.1-rc.2`、Cordis `4.0.1` 和 Schemastery `3.18.1`。
- `cordis.patch.yml` 已声明必需的 `subagents` 注入，新 profile 不再因缺少服务声明而启动失败。

功能代码与 `1.1.0` 保持一致，并已通过 44 项测试和真实 DSH 生命周期冒烟。

## 1.1.0 为什么升级

这版额外研究了 Claude Code 公开可验证的架构资料、Anthropic 官方公开机制，以及公开 issue 中真实出现的循环故障。**没有复制、打包或分发任何未授权泄露源码。**

公开资料暴露出的几个很现实的问题被直接转成了工程约束：

- 同一个工具/参数反复调用，甚至几十次，不能算“持续进展”。
- Stop/SessionEnd 一类 hook 如果可以继续驱动 Agent，本身必须有上限，否则“为了阻止结束而永远不结束”这种喜剧就会发生。
- 子 Agent 的价值不只是并行，还是把探索垃圾隔离在独立 context 中；父 Agent 应负责整合和最终验收。
- 长任务 context 不能只靠无限累积 transcript，需要稳定目标、活动计划、工作证据、压缩状态和控制信息分层。

## 主要能力

### DSH-native Loop 增强

使用官方扩展点：

- `agent/pre-step`
- `tools/post-execute`
- `agent/error`
- `agent/turn-stopping`
- `agent/disposed`
- `agent.steer()`
- Session 自定义事件

不实例化、不 monkey-patch `ReactLoopAgent`。

### Strategy Router

支持：

```text
direct
research
code
analysis
design
long-task
```

v1.1 会区分“修改代码”和“阅读/解释代码”。只读源码分析不再被 Verifier 荒唐地要求“必须修改一个文件证明你工作过”。

### Durable Goal / Plan / World State

按 `{session, turn}` 保存：

```text
Goal
Plan
Observations
Evidence fingerprints
Budget
Liveness
Verification state
Reflection state
Checkpoints
```

写入：

```text
smart-runtime/snapshot
smart-runtime/observation
smart-runtime/checkpoint
```

支持 resume/fork 后恢复，并兼容 v1.0 observation event，升级时会补生成 `outcomeFingerprint`。

### Five-layer bounded context

模型看到的 Smart Runtime working context 被分成五层：

1. **Stable Goal**：策略、目标、验收条件、约束
2. **Active Plan**：里程碑、完成度、当前 milestone
3. **Working Evidence**：近期工具结果
4. **Distilled State**：成功/失败工具面、重复动作、恢复轮次、阻塞项
5. **Archive / Control**：预算、stop boundary、最近 checkpoint、delegation 规则

整个投影仍受 `contextMaxChars` 限制。真正 transcript compaction 继续交给 dsh 官方 compaction 插件。

### Anti-stall Liveness Guard

v1.1 同时跟踪两个指纹：

```text
Action fingerprint  = tool + arguments
Outcome fingerprint = action + success/fail + observable result
```

区别很重要：

- 同一 polling 动作但结果在变化，可能是合法等待。
- 同一动作连结果都完全一样地重复，通常就是卡住了。

默认：

```yaml
repeatedToolSoftRun: 3
repeatedToolHardRun: 8
```

软阈值会要求换动作/收敛；硬阈值通过官方 `PreStepDecision { kind: reject }` 阻止继续生成 step。

重复的相同成功结果也**不会刷新 `lastProgressStep`**，因此“重复 grep 同一结果 30 次”不会再被算作进展。

### Bounded Stop Verification

`agent/turn-stopping` 可以用 `agent.steer()` 反对结束，这很强，也很危险。

v1.1 增加 durable stop-boundary 状态：

```text
stopBoundaryVisits
stopSteers
sameEvidenceStopVisits
lastStopToolCount
lastStopPlanCompletion
```

如果 Verifier 让 Agent 继续，但下一次回到 stop boundary 时：

```text
工具证据没增加
AND
Plan 完成度没变化
```

它会先给一次 liveness recovery 指令，要求“做一个真正产生新证据的动作，或者明确报告阻塞”。继续原地踏步达到阈值后，**允许有界收敛，不再 steer**。

默认：

```yaml
maxStopSteers: 3
maxSameEvidenceStopVisits: 2
```

这避免 Verifier / Reflection 自己成为无限循环来源。

### Stronger Evidence Verifier

#### 代码修改任务

要求看到：

- 实际 mutation evidence，例如 patch/edit/write
- test/typecheck/build/lint/compile 等检查证据
- 连续失败不能悬而不决

#### 只读代码任务

不要求伪造修改，只要求有实际代码/仓库读取证据。

#### Research

至少要有多个成功 research observation，并且至少有两个**不同 evidence outcome**；重复同一结果不能冒充“交叉验证”。

### Conditional Reflection

只在真正值得反思时触发：

- 连续 tool failure
- runtime/model error
- 相同 action + outcome 重复
- 长时间无 observable progress

而且 Reflection 次数有上限，并要求出现新 evidence 才能再次触发。

### Subagent Isolation Guidance

Smart Runtime 会读取 `ctx.subagents` 中已注册 provider，但默认不偷偷启动子 Agent。

对于 code：

```text
child = 有边界的实现/审查任务 + 独立 context/workspace（provider 支持时）
parent = 集成 + final test
```

避免多个可写 sibling 同时改同一 working tree。

对于 research：

```text
child = 不同证据问题 / 不同 source domain
parent = 汇总 findings + source identifiers + uncertainty + conflicts
```

原始探索噪声尽量留在 child context。

## 安装

先下载源码并生成可安装包：

```bash
git clone https://github.com/Stone520ha/dsh-smart-runtime-1.1.0.git
cd dsh-smart-runtime-1.1.0
npm install
npm run check
npm pack
```

再安装到目标 profile：

```bash
dsh plugin --profile <profile> add ./dsh-smart-runtime-1.1.1.tgz
```

检查：

```bash
dsh --profile <profile> --dump-config
```

应该看到：

```yaml
- id: smart-runtime
  name: dsh-smart-runtime
```

## 推荐搭配官方插件

```text
@deepseek-ai/dsh-compaction-basic
@deepseek-ai/dsh-repeat-tool-reminder
@deepseek-ai/dsh-tool-call-timeout-policy
@deepseek-ai/dsh-plan-mode
@deepseek-ai/dsh-goal
@deepseek-ai/dsh-goal-round-driver
@deepseek-ai/dsh-subagent
```

真实 Codex / Claude Code 子 Agent 继续用 dsh 官方 provider：

```bash
dsh plugin --profile <profile> add \
  @deepseek-ai/dsh-subagent-codex \
  @deepseek-ai/dsh-subagent-claude-code
```

Smart Runtime 负责策略、状态、隔离建议、父级验收；实际鉴权、权限、sandbox、子进程生命周期交给官方 provider。

## 默认关键配置

| 参数 | 默认 | 作用 |
|---|---:|---|
| `contextLayering` | `true` | 启用五层 working context |
| `contextRefreshEverySteps` | `4` | Context 重投影频率 |
| `contextMaxChars` | `7600` | Smart Runtime context 上限 |
| `verificationMinScore` | `0.64` | Verifier 最低分 |
| `maxVerificationRounds` | `2` | Verification round 上限 |
| `livenessGuard` | `true` | 防 stall / stop-loop |
| `repeatedToolSoftRun` | `3` | 重复 action 软提醒 |
| `repeatedToolHardRun` | `8` | 相同 action+outcome 硬停 |
| `maxStopSteers` | `3` | stop boundary 总 steer 上限 |
| `maxSameEvidenceStopVisits` | `2` | 无新 evidence 的 stop 重访上限 |
| `softMaxStepsPerTurn` | `18` | 开始收敛 |
| `hardMaxStepsPerTurn` | `28` | step 硬上限 |
| `maxToolCallsPerTurn` | `48` | tool-call 硬上限 |
| `maxDurationMs` | `900000` | 单 turn 默认 15 分钟 |

完整配置见 `cordis.patch.yml`。

## 测试

```bash
npm run typecheck
npm run build
npm test
npm run pack:check
```

1.1.1 包含 Router、Goal、Plan、Budget、Context、World State、Verifier、Reflection、Persistence、Liveness 以及 DSH lifecycle mock integration tests。

## 兼容目标

按 DeepSeek Harness 当前 `0.1.1-rc.2` 公共扩展接口验证。Harness 仍是 Developer Preview，部署请锁定已验证版本并在升级前跑完整测试。靠祈祷兼容性通常是最便宜也最昂贵的发布流程。
