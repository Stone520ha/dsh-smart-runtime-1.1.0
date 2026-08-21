import { planCompletion } from './planner.js';
import { isCodeChangeRequest, isLikelyExecutionTool, isLikelyMutationTool, isLikelyResearchTool, isLikelyTestTool, unique } from './util.js';
export function assessVerification(state, config) {
    const observations = state.observations;
    const success = observations.filter(item => !item.isError);
    const failed = observations.filter(item => item.isError);
    const checklist = [...state.goal.acceptanceCriteria];
    const blockers = [];
    const warnings = [];
    const completion = planCompletion(state.plan);
    let score = 0.32;
    score += completion * 0.24;
    score += Math.min(0.18, success.length * 0.03);
    score -= Math.min(0.18, failed.length * 0.035);
    let requiresObservableAction = false;
    switch (state.strategy) {
        case 'code': {
            const mutationRequested = isCodeChangeRequest(state.goal.createdFrom);
            requiresObservableAction = mutationRequested;
            const hasExecution = success.some(item => isLikelyExecutionTool(item.tool));
            const hasMutation = success.some(item => isLikelyMutationTool(item.tool, item.argumentPreview, item.resultPreview));
            const hasTestEvidence = success.some(item => isLikelyTestTool(item.tool, item.resultPreview));
            if (mutationRequested) {
                if (!hasMutation)
                    blockers.push('No successful code/file mutation evidence has been observed for this requested code change.');
                else
                    score += 0.12;
                if (!hasTestEvidence)
                    blockers.push('No convincing test, typecheck, build, compile, or lint evidence has been observed yet.');
                else
                    score += 0.16;
            }
            else {
                if (success.length === 0)
                    blockers.push('No observable repository/code evidence has been inspected for this code-reading task.');
                else
                    score += 0.12;
            }
            if (!hasExecution && mutationRequested)
                warnings.push('No successful execution/build command has been observed.');
            else if (hasExecution)
                score += 0.08;
            break;
        }
        case 'research': {
            requiresObservableAction = true;
            const researchTools = success.filter(item => isLikelyResearchTool(item.tool));
            const distinctSurfaces = unique(researchTools.map(item => item.tool)).length;
            const distinctOutcomes = unique(researchTools.map(item => item.outcomeFingerprint)).length;
            if (researchTools.length < 2)
                blockers.push('Research evidence is too thin; fewer than two successful research observations are present.');
            else
                score += 0.12;
            if (distinctOutcomes < 2)
                blockers.push('Research observations do not yet contain at least two distinct evidence outcomes.');
            else
                score += 0.06;
            if (distinctSurfaces < 2 && researchTools.length >= 2)
                warnings.push('Evidence came through one research surface; cross-check important claims when another source path is available.');
            else if (distinctSurfaces >= 2)
                score += 0.04;
            break;
        }
        case 'analysis':
            if (success.length === 0)
                warnings.push('No external/tool evidence was observed; verify that this analysis genuinely required none.');
            else
                score += 0.08;
            break;
        case 'design':
            if (success.length === 0)
                warnings.push('No observable artifact/tool evidence was seen; ensure the requested concrete design deliverable actually exists.');
            else
                score += 0.06;
            break;
        case 'long-task':
            requiresObservableAction = true;
            if (completion < 0.6)
                blockers.push(`Plan completion is low (${Math.round(completion * 100)}%).`);
            if (success.length < 2)
                warnings.push('Long task has little observable execution evidence.');
            break;
        default:
            score += 0.2;
    }
    if (state.budget.consecutiveToolFailures >= config.reflectionFailureThreshold) {
        blockers.push(`${state.budget.consecutiveToolFailures} consecutive tool failures remain unresolved.`);
        score -= 0.15;
    }
    if (state.budget.currentRepeatedOutcomeRun >= config.repeatedToolSoftRun) {
        blockers.push(`The same action produced the same observable outcome ${state.budget.currentRepeatedOutcomeRun} times; this is stalled, not progress.`);
        score -= 0.12;
    }
    score = Math.max(0, Math.min(1, score));
    const pass = blockers.length === 0 && score >= config.verificationMinScore;
    return {
        score,
        pass,
        blockers,
        warnings,
        checklist,
        evidenceCount: observations.length,
        successfulEvidenceCount: success.length,
        failedEvidenceCount: failed.length,
        planCompletion: completion,
        requiresObservableAction,
    };
}
export function verificationPrompt(state, assessment) {
    const lines = [
        `Smart Runtime final verification checkpoint for ${state.strategy} work.`,
        `Goal: ${state.goal.objective}`,
        `Plan completion: ${Math.round(assessment.planCompletion * 100)}%.`,
        `Current evidence score: ${assessment.score.toFixed(2)}.`,
    ];
    if (assessment.blockers.length > 0) {
        lines.push('Material gaps detected:');
        for (const item of assessment.blockers)
            lines.push(`- ${item}`);
    }
    if (assessment.warnings.length > 0) {
        lines.push('Warnings to inspect:');
        for (const item of assessment.warnings)
            lines.push(`- ${item}`);
    }
    lines.push('Do not merely claim completion. Resolve a material gap with one observable action when possible. If a check cannot actually be run, state that limitation plainly instead of inventing evidence. Finish only when the goal is genuinely satisfied or the remaining blocker is real and explicit.');
    return lines.join('\n');
}
export function shouldRunVerification(state, config) {
    return config.verification
        && config.verifyStrategies.includes(state.strategy)
        && state.verificationRounds < config.maxVerificationRounds;
}
//# sourceMappingURL=verifier.js.map