import type { QuestionStep, StepNode, TaskStep, Template } from './model.ts';

export function newId(): string {
  return crypto.randomUUID();
}

export function newTask(title = ''): TaskStep {
  return { id: newId(), kind: 'task', title };
}

export function newQuestion(title = ''): QuestionStep {
  return { id: newId(), kind: 'question', title, yes: [], no: [] };
}

/** Starter template. Ids are fixed so a fresh install and a reset share ids. */
export function defaultTemplate(): Template {
  return {
    version: 1,
    steps: [
      { id: 'default-1', kind: 'task', title: 'Use Bug Investigator' },
      { id: 'default-2', kind: 'task', title: 'Use Claude to fix and write E2E test' },
      {
        id: 'default-q-dbfix',
        kind: 'question',
        title: 'Is this a DB fix?',
        yes: [{ id: 'default-dbfix-tag', kind: 'task', title: 'Add the dbfix tag to the ticket' }],
        no: [],
      },
      { id: 'default-3', kind: 'task', title: 'Check if test coverage is correct against E2E test and adjust accordingly' },
      { id: 'default-4', kind: 'task', title: 'Check E2E test will run and pass on your local, team6 and release' },
      {
        id: 'default-5',
        kind: 'task',
        title: 'Create a report using Claude of your newly written E2E test against test coverage and attach to ticket',
      },
      {
        id: 'default-6',
        kind: 'task',
        title: 'After deployment, run E2E from local pointed to team6 and set ticket to ready for release',
      },
    ],
  };
}

export class TemplateError extends Error {}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseSteps(raw: unknown, path: string, seen: Set<string>): StepNode[] {
  if (!Array.isArray(raw)) throw new TemplateError(`${path} must be a list`);
  return raw.map((item: unknown, index) => parseStep(item, `${path}[${index}]`, seen));
}

function parseStep(raw: unknown, path: string, seen: Set<string>): StepNode {
  if (!isRecord(raw)) throw new TemplateError(`${path} must be an object`);
  const { id, kind, title } = raw;
  if (typeof id !== 'string' || id.length === 0) throw new TemplateError(`${path}.id is missing`);
  if (seen.has(id)) throw new TemplateError(`${path}.id "${id}" is used twice`);
  seen.add(id);
  if (typeof title !== 'string' || title.trim().length === 0) throw new TemplateError(`${path}.title is empty`);

  if (kind === 'task') return { id, kind, title: title.trim() };
  if (kind === 'question') {
    return {
      id,
      kind,
      title: title.trim(),
      yes: parseSteps(raw['yes'], `${path}.yes`, seen),
      no: parseSteps(raw['no'], `${path}.no`, seen),
    };
  }
  throw new TemplateError(`${path}.kind must be "task" or "question"`);
}

/** Validates unknown input (storage or an imported file) into a Template. */
export function parseTemplate(raw: unknown): Template {
  if (!isRecord(raw)) throw new TemplateError('Template must be an object');
  if (raw['version'] !== 1) throw new TemplateError('Unsupported template version');
  return { version: 1, steps: parseSteps(raw['steps'], 'steps', new Set()) };
}
