import type { Answer, Progress, StepNode, Template } from './model.ts';

export interface FlatStep {
  node: StepNode;
  depth: number;
}

export type StepState = 'done' | 'last-done' | 'current' | 'pending';

export interface StepView extends FlatStep {
  state: StepState;
  answer: Answer | undefined;
}

export type TicketStatus = 'empty' | 'partial' | 'complete';

export function emptyProgress(): Progress {
  return { done: [], answers: {} };
}

/** Linear step sequence: a question is followed by the branch its answer selects. */
export function flatten(
  steps: readonly StepNode[],
  answers: Readonly<Record<string, Answer>>,
  depth = 0,
): FlatStep[] {
  const out: FlatStep[] = [];
  for (const node of steps) {
    out.push({ node, depth });
    if (node.kind === 'question') {
      const answer = answers[node.id];
      if (answer) out.push(...flatten(answer === 'yes' ? node.yes : node.no, answers, depth + 1));
    }
  }
  return out;
}

/** Done ids that still exist in the current sequence (the template may have changed). */
function visibleDone(sequence: readonly FlatStep[], progress: Progress): string[] {
  const ids = new Set(sequence.map((s) => s.node.id));
  return progress.done.filter((id) => ids.has(id));
}

function withDone(done: string[], answers: Readonly<Record<string, Answer>>): Progress {
  const kept: Record<string, Answer> = {};
  for (const id of done) {
    const answer = answers[id];
    if (answer) kept[id] = answer;
  }
  return { done, answers: kept };
}

export function viewSteps(template: Template, progress: Progress): StepView[] {
  const sequence = flatten(template.steps, progress.answers);
  const done = visibleDone(sequence, progress);
  const doneSet = new Set(done);
  const lastDone = done.at(-1);
  let currentAssigned = false;

  return sequence.map((step) => {
    const id = step.node.id;
    let state: StepState;
    if (doneSet.has(id)) {
      state = id === lastDone ? 'last-done' : 'done';
    } else if (!currentAssigned) {
      state = 'current';
      currentAssigned = true;
    } else {
      state = 'pending';
    }
    const answer = step.node.kind === 'question' && doneSet.has(id) ? progress.answers[id] : undefined;
    return { ...step, state, answer };
  });
}

function currentStep(template: Template, progress: Progress): StepNode | undefined {
  return viewSteps(template, progress).find((v) => v.state === 'current')?.node;
}

/** Marks the current task done. Any other step id is ignored. */
export function completeStep(template: Template, progress: Progress, stepId: string): Progress {
  const current = currentStep(template, progress);
  if (!current || current.id !== stepId || current.kind !== 'task') return progress;
  const sequence = flatten(template.steps, progress.answers);
  return withDone([...visibleDone(sequence, progress), stepId], progress.answers);
}

/** Answers the current question. Any other step id is ignored. */
export function answerQuestion(
  template: Template,
  progress: Progress,
  questionId: string,
  answer: Answer,
): Progress {
  const current = currentStep(template, progress);
  if (!current || current.id !== questionId || current.kind !== 'question') return progress;
  const sequence = flatten(template.steps, progress.answers);
  return withDone([...visibleDone(sequence, progress), questionId], {
    ...progress.answers,
    [questionId]: answer,
  });
}

/** Reverts the most recent done step; a reverted question loses its answer. */
export function undoLast(template: Template, progress: Progress): Progress {
  const sequence = flatten(template.steps, progress.answers);
  const done = visibleDone(sequence, progress).slice(0, -1);
  return withDone(done, progress.answers);
}

export interface TicketSummary {
  status: TicketStatus;
  doneCount: number;
  total: number;
}

export function summarize(template: Template, progress: Progress): TicketSummary {
  const views = viewSteps(template, progress);
  const doneCount = views.filter((v) => v.state === 'done' || v.state === 'last-done').length;
  const total = views.length;
  let status: TicketStatus = 'partial';
  if (doneCount === 0) status = 'empty';
  else if (doneCount === total) status = 'complete';
  return { status, doneCount, total };
}
