import { hashText, preview, safeString, stableJson } from './util.js';
export function createObservation(state, exec, result, previewChars) {
    const canonicalArgs = stableJson(exec.arguments ?? null);
    const resultText = resultTextOf(result);
    const at = Date.now();
    const fingerprint = hashText(`${exec.name}\n${canonicalArgs}`);
    const outcomeFingerprint = hashText(`${fingerprint}\n${result.isError ? 'ERR' : 'OK'}\n${resultText}`);
    return {
        id: `obs-${state.turn}-${state.budget.toolCalls + 1}-${hashText(`${exec.callId}:${at}`)}`,
        turn: state.turn,
        tool: exec.name,
        callId: exec.callId,
        fingerprint,
        outcomeFingerprint,
        isError: Boolean(result.isError),
        summary: result.isError
            ? `Tool ${exec.name} failed${result.error?.message ? `: ${preview(result.error.message, 180)}` : '.'}`
            : `Tool ${exec.name} completed successfully.`,
        argumentPreview: preview(canonicalArgs, previewChars),
        resultPreview: preview(resultText, previewChars),
        at,
    };
}
export function applyObservationToBudget(state, observation) {
    const budget = state.budget;
    budget.toolCalls += 1;
    if (observation.isError)
        budget.consecutiveToolFailures += 1;
    else
        budget.consecutiveToolFailures = 0;
    if (budget.lastFingerprint === observation.fingerprint) {
        budget.currentRepeatedFingerprintRun += 1;
    }
    else {
        budget.lastFingerprint = observation.fingerprint;
        budget.currentRepeatedFingerprintRun = 1;
    }
    budget.maxRepeatedFingerprintRun = Math.max(budget.maxRepeatedFingerprintRun, budget.currentRepeatedFingerprintRun);
    if (budget.lastOutcomeFingerprint === observation.outcomeFingerprint) {
        budget.currentRepeatedOutcomeRun += 1;
    }
    else {
        budget.lastOutcomeFingerprint = observation.outcomeFingerprint;
        budget.currentRepeatedOutcomeRun = 1;
    }
    budget.maxRepeatedOutcomeRun = Math.max(budget.maxRepeatedOutcomeRun, budget.currentRepeatedOutcomeRun);
    // Observable progress means a successful result that is not the exact same
    // action+outcome replay. This catches "grep the same thing 30 times" loops.
    if (!observation.isError && budget.currentRepeatedOutcomeRun === 1) {
        budget.lastProgressStep = budget.steps;
    }
}
function resultTextOf(result) {
    if (result.isError && result.error?.message)
        return result.error.message;
    if (result.content !== undefined)
        return contentToText(result.content);
    if (result.value !== undefined)
        return safeString(result.value);
    return result.isError ? 'tool failed' : 'tool completed';
}
function contentToText(content) {
    if (typeof content === 'string')
        return content;
    if (!Array.isArray(content))
        return safeString(content);
    const out = [];
    for (const block of content) {
        if (typeof block === 'string') {
            out.push(block);
            continue;
        }
        if (block && typeof block === 'object') {
            const record = block;
            if (typeof record.text === 'string')
                out.push(record.text);
            else
                out.push(safeString(record));
        }
    }
    return out.join('\n');
}
//# sourceMappingURL=observations.js.map