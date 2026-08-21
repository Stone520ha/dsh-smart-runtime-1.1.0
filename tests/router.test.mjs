import test from 'node:test'
import assert from 'node:assert/strict'
import { classifyStrategy, routeStrategy } from '../dist/router.js'

test('routes coding tasks', () => {
  assert.equal(classifyStrategy('请检查这个 TypeScript 仓库，修复 bug 并运行测试'), 'code')
})

test('routes research tasks', () => {
  assert.equal(classifyStrategy('去网上调研竞品并给出资料来源'), 'research')
})

test('routes analysis tasks', () => {
  assert.equal(classifyStrategy('分析这组数据的趋势和异常原因'), 'analysis')
})

test('routes design tasks', () => {
  assert.equal(classifyStrategy('做一个家具产品设计方案和造型概念'), 'design')
})

test('routes long tasks with strong long-task language', () => {
  assert.equal(classifyStrategy('从头到尾做一个完整项目，分阶段交付最终版本'), 'long-task')
})

test('direct is fallback', () => {
  assert.equal(classifyStrategy('你好，解释一下这个概念'), 'direct')
})

test('route returns bounded confidence', () => {
  const result = routeStrategy('implement and test this repository plugin')
  assert.equal(result.strategy, 'code')
  assert.ok(result.confidence >= 0 && result.confidence <= 1)
  assert.ok(result.scores.length >= 6)
})

test('read-only source explanation routes to analysis instead of mutation-oriented code mode', () => {
  assert.equal(classifyStrategy('explain this source code architecture'), 'analysis')
})
