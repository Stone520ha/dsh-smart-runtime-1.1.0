import { clamp, compactWhitespace, isCodeChangeRequest, splitSentences, unique } from './util.js';
const CONSTRAINT_MARKERS = /(?:必须|不能|不要|只要|需要|要求|限制|不超过|至少|最多|must|must not|cannot|only|require|constraint|at least|at most)/i;
export function createGoal(prompt, strategy, confidence) {
    const clean = compactWhitespace(prompt);
    const sentences = splitSentences(clean);
    const constraints = unique(sentences.filter(sentence => CONSTRAINT_MARKERS.test(sentence)).slice(0, 8));
    const acceptanceCriteria = unique([
        ...strategyCriteria(strategy, clean),
        ...constraints.map(item => `Respect explicit constraint: ${item}`),
    ]).slice(0, 12);
    return {
        objective: deriveObjective(clean),
        acceptanceCriteria,
        constraints,
        createdFrom: clean.slice(0, 1600),
        confidence: clamp(confidence, 0, 1),
    };
}
function deriveObjective(prompt) {
    const lines = prompt.split('\n').map(line => line.trim()).filter(Boolean);
    if (lines.length === 0)
        return 'Complete the current user request.';
    const first = lines[0];
    if (first.length <= 280)
        return first;
    return `${first.slice(0, 277)}…`;
}
function strategyCriteria(strategy, prompt) {
    switch (strategy) {
        case 'code':
            return isCodeChangeRequest(prompt)
                ? [
                    'Inspect the real code/environment before making assumptions.',
                    'Implement the requested behavior coherently rather than only describing it.',
                    'Run relevant automated checks or clearly disclose which checks could not be run.',
                    'Avoid unrelated changes and preserve compatibility unless the task requires otherwise.',
                ]
                : [
                    'Inspect the real code/environment before making assumptions.',
                    'Answer from observable repository/code evidence rather than inventing implementation details.',
                    'Do not mutate files unless the request actually asks for a change.',
                    'State any part that could not be verified from the available code/environment.',
                ];
        case 'research':
            return [
                'Use relevant and sufficiently authoritative evidence.',
                'Cross-check material claims when more than one source is reasonably available.',
                'Distinguish verified facts, inference, and unresolved uncertainty.',
                'Produce a decision-useful synthesis instead of a source dump.',
            ];
        case 'analysis':
            return [
                'Use the actual inputs or explicitly state missing inputs.',
                'Make calculations/comparisons traceable.',
                'Check at least one plausible alternative explanation when material.',
                'End with a conclusion tied to evidence and assumptions.',
            ];
        case 'design':
            return [
                'Produce a concrete design deliverable or specification.',
                'Honor explicit functional and aesthetic constraints.',
                'Check feasibility, consistency, and user-facing consequences.',
                'Identify any unresolved tradeoff that materially affects the design.',
            ];
        case 'long-task':
            return [
                'Break work into explicit milestones with completion conditions.',
                'Keep progress and blockers current across the task.',
                'Verify critical milestones with observable evidence.',
                'Converge to a complete deliverable rather than indefinitely exploring.',
            ];
        default:
            return [
                'Answer the request directly and completely.',
                'Do not invent unsupported facts.',
            ];
    }
}
//# sourceMappingURL=goal.js.map