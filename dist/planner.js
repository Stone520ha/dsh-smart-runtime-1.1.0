import { isLikelyExecutionTool, isLikelyFileTool, isLikelyResearchTool, isLikelyTestTool } from './util.js';
export function createPlan(strategy) {
    const rows = planRows(strategy);
    return rows.map((row, index) => ({
        id: `${strategy}-${index + 1}`,
        title: row[0],
        doneWhen: row[1],
        status: index === 0 ? 'active' : 'pending',
        evidenceIds: [],
    }));
}
export function updatePlan(plan, observation) {
    const next = plan.map(item => ({ ...item, evidenceIds: [...item.evidenceIds] }));
    const candidateIndexes = candidatesForObservation(next, observation);
    if (candidateIndexes.length === 0)
        return next;
    const index = candidateIndexes.find(i => next[i].status === 'active' || next[i].status === 'pending') ?? candidateIndexes[0];
    const item = next[index];
    if (!item.evidenceIds.includes(observation.id))
        item.evidenceIds.push(observation.id);
    if (observation.isError) {
        item.status = item.status === 'done' ? 'done' : 'blocked';
        item.note = `Latest related tool failed: ${observation.tool}`;
        return next;
    }
    item.status = 'done';
    item.note = `Evidence: ${observation.tool}`;
    activateNext(next);
    return next;
}
export function markPlanForReflection(plan) {
    const next = plan.map(item => ({ ...item, evidenceIds: [...item.evidenceIds] }));
    for (const item of next) {
        if (item.status === 'blocked') {
            item.status = 'active';
            item.note = 'Re-opened after reflection; use a materially different approach.';
            break;
        }
    }
    return next;
}
export function planCompletion(plan) {
    if (plan.length === 0)
        return 1;
    const done = plan.filter(item => item.status === 'done' || item.status === 'skipped').length;
    return done / plan.length;
}
function activateNext(plan) {
    if (plan.some(item => item.status === 'active'))
        return;
    const next = plan.find(item => item.status === 'pending');
    if (next)
        next.status = 'active';
}
function candidatesForObservation(plan, observation) {
    const tool = observation.tool;
    const text = `${observation.resultPreview} ${observation.summary}`;
    const indexes = [];
    for (let i = 0; i < plan.length; i++) {
        const title = plan[i].title.toLowerCase();
        if (isLikelyResearchTool(tool) && /research|evidence|source|调研|证据|资料/.test(title))
            indexes.push(i);
        if (isLikelyFileTool(tool) && /inspect|repository|input|约束|代码|环境|read/.test(title))
            indexes.push(i);
        if (isLikelyExecutionTool(tool) && /implement|execute|build|修改|实现|执行|produce/.test(title))
            indexes.push(i);
        if (isLikelyTestTool(tool, text) && /verify|test|check|验证|测试/.test(title))
            indexes.push(i);
    }
    return indexes;
}
function planRows(strategy) {
    switch (strategy) {
        case 'code':
            return [
                ['Inspect repository and constraints', 'Relevant files, environment, and requested behavior are understood from actual repository evidence.'],
                ['Form implementation approach', 'A minimal coherent change path is identified.'],
                ['Implement the change', 'Requested behavior exists in the working tree.'],
                ['Run checks and tests', 'Relevant tests/build/type checks have run or a concrete limitation is documented.'],
                ['Verify final diff and result', 'No material requirement is missing and unrelated changes are avoided.'],
            ];
        case 'research':
            return [
                ['Define evidence question', 'The research question and evidence threshold are explicit.'],
                ['Gather primary evidence', 'Relevant authoritative or first-party material is collected when available.'],
                ['Cross-check important claims', 'Material claims have corroboration or disclosed uncertainty.'],
                ['Synthesize findings', 'Evidence is converted into a coherent answer or recommendation.'],
                ['Verify citations and gaps', 'Major claims are traceable and unresolved gaps are explicit.'],
            ];
        case 'analysis':
            return [
                ['Inspect inputs', 'Actual data/inputs and assumptions are known.'],
                ['Compute or compare', 'Core calculations or comparisons are performed.'],
                ['Test alternatives', 'Material alternative explanations or scenarios are checked.'],
                ['Synthesize conclusion', 'Conclusion follows from inputs and calculations.'],
                ['Verify assumptions', 'Important assumptions and limitations are explicit.'],
            ];
        case 'design':
            return [
                ['Capture constraints', 'Functional, aesthetic, and delivery constraints are explicit.'],
                ['Develop concrete concept', 'A tangible design direction exists.'],
                ['Check feasibility', 'Implementation/manufacturing/interaction feasibility is considered.'],
                ['Refine against criteria', 'Known gaps are corrected against acceptance criteria.'],
                ['Finalize deliverable', 'The requested design artifact/specification is complete.'],
            ];
        case 'long-task':
            return [
                ['Define milestones', 'The work is decomposed into bounded milestones.'],
                ['Execute highest-value milestone', 'The next milestone has observable output.'],
                ['Integrate outputs', 'Separate workstreams are reconciled into one state.'],
                ['Verify critical path', 'Critical requirements are tested against evidence.'],
                ['Finalize and report gaps', 'Deliverable is complete and residual limitations are explicit.'],
            ];
        default:
            return [
                ['Complete request', 'The user request is answered directly and sufficiently.'],
            ];
    }
}
//# sourceMappingURL=planner.js.map