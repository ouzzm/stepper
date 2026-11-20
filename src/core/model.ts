export type Answer = 'yes' | 'no';

export interface TaskStep {
  id: string;
  kind: 'task';
  title: string;
}

export interface QuestionStep {
  id: string;
  kind: 'question';
  title: string;
  yes: StepNode[];
  no: StepNode[];
}

export type StepNode = TaskStep | QuestionStep;

export interface Template {
  version: 1;
  steps: StepNode[];
}

/**
 * Progress of one ticket. `done` is an ordered stack of completed step ids
 * (tasks and answered questions); `answers` holds the answer of every
 * question that is in `done`.
 */
export interface Progress {
  done: string[];
  answers: Record<string, Answer>;
}
