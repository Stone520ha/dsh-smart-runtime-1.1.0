import type { Strategy } from './types.js'

interface RouteScore {
  strategy: Strategy
  score: number
}

const RULES: Array<{ strategy: Strategy; weights: Array<[RegExp, number]> }> = [
  {
    strategy: 'long-task',
    weights: [
      [/(?:长期|复杂任务|多步骤|端到端|完整项目|从头到尾|完整版本|最终版本|roadmap|multi[- ]?step|long[- ]?running|end[- ]?to[- ]?end)/i, 5],
      [/(?:阶段|里程碑|milestone|phase|workflow|orchestrat)/i, 2],
    ],
  },
  {
    strategy: 'code',
    weights: [
      [/(?:代码|编程|源码|bug|报错|重构|测试|部署|仓库|repo|typescript|javascript|python|rust|java|api|sql|code|coding|implement|debug|refactor|test)/i, 4],
      [/(?:npm|pnpm|yarn|git|github|compile|build|lint|typecheck|cli|sdk|plugin)/i, 2],
    ],
  },
  {
    strategy: 'research',
    weights: [
      [/(?:调研|研究|搜索|查资料|资料来源|竞品|市场|文献|证据|验证来源|research|search|sources?|benchmark|competitive)/i, 4],
      [/(?:官网|官方|论文|引用|cite|reference|web|browser)/i, 2],
    ],
  },
  {
    strategy: 'analysis',
    weights: [
      [/(?:解释|阅读|理解|梳理|看看).{0,12}(?:代码|源码|仓库|repo)|(?:explain|understand|review|walk through).{0,16}(?:code|source|repo)/i, 5],
      [/(?:分析|数据|统计|计算|比较|诊断|原因|模型|指标|analysis|analy[sz]e|data|metrics?|compare)/i, 4],
      [/(?:表格|excel|csv|趋势|ratio|variance|forecast|预测)/i, 2],
    ],
  },
  {
    strategy: 'design',
    weights: [
      [/(?:设计概念|产品设计|视觉设计|交互设计|家具|造型|设计方案|design|prototype|render|\bui\b|\bux\b)/i, 4],
      [/(?:品牌|style|layout|wireframe|mockup|aesthetic|审美)/i, 2],
    ],
  },
]

export interface RouteResult {
  strategy: Strategy
  confidence: number
  scores: RouteScore[]
}

export function classifyStrategy(input: string): Strategy {
  return routeStrategy(input).strategy
}

export function routeStrategy(input: string): RouteResult {
  const text = input.toLowerCase()
  const scores: RouteScore[] = RULES.map(rule => ({
    strategy: rule.strategy,
    score: rule.weights.reduce((sum, [pattern, weight]) => sum + (pattern.test(text) ? weight : 0), 0),
  }))
  scores.push({ strategy: 'direct', score: 1 })
  scores.sort((a, b) => b.score - a.score)
  const first = scores[0]!
  const second = scores[1]!
  const confidence = first.score <= 1 ? 0.55 : Math.min(0.98, 0.6 + (first.score - second.score) * 0.08 + first.score * 0.03)
  return { strategy: first.strategy, confidence, scores }
}

export function strategyInstruction(strategy: Strategy): string {
  switch (strategy) {
    case 'research':
      return 'Research mode: define the question and evidence threshold, gather multiple relevant sources, cross-check material claims, preserve source-to-claim traceability, and stop when evidence is sufficient.'
    case 'code':
      return 'Coding mode: inspect the real repository/environment before edits, make the smallest coherent change, execute available checks/tests, treat tool output as world-state evidence, and do not claim success without verification.'
    case 'analysis':
      return 'Analysis mode: define the decision question, inspect actual inputs, calculate explicitly, test alternative explanations, and separate observed facts from inference.'
    case 'design':
      return 'Design mode: identify constraints and success criteria, research only when needed, produce a concrete solution, check usability/feasibility/consistency, and iterate only against identified gaps.'
    case 'long-task':
      return 'Long-task mode: keep a compact goal-plan-progress state, execute milestone by milestone, preserve important evidence, delegate isolated work when useful, verify milestones, and converge instead of expanding scope indefinitely.'
    default:
      return 'Direct mode: solve the request with the minimum sufficient reasoning and tool use. Do not create artificial process for a simple task.'
  }
}
