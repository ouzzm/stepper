import type { Answer, Progress, Template } from './model.ts';
import { defaultTemplate, parseTemplate } from './template.ts';

export const TEMPLATE_KEY = 'template';
const PROGRESS_PREFIX = 'progress:';

export function progressKey(ticketId: string): string {
  return `${PROGRESS_PREFIX}${ticketId}`;
}

export function ticketIdFromKey(key: string): string | undefined {
  return key.startsWith(PROGRESS_PREFIX) ? key.slice(PROGRESS_PREFIX.length) : undefined;
}

/** Stored template, or the default one when nothing valid is stored. */
export function readTemplate(raw: unknown): Template {
  if (raw === undefined) return defaultTemplate();
  try {
    return parseTemplate(raw);
  } catch (error) {
    console.warn('[Stepper] Stored template is invalid, using the default one.', error);
    return defaultTemplate();
  }
}

export function readProgress(raw: unknown): Progress | undefined {
  if (typeof raw !== 'object' || raw === null) return undefined;
  const { done, answers } = raw as { done?: unknown; answers?: unknown };
  if (!Array.isArray(done) || !done.every((id): id is string => typeof id === 'string')) return undefined;
  const parsedAnswers: Record<string, Answer> = {};
  if (typeof answers === 'object' && answers !== null) {
    for (const [id, value] of Object.entries(answers)) {
      if (value === 'yes' || value === 'no') parsedAnswers[id] = value;
    }
  }
  return { done, answers: parsedAnswers };
}

export async function loadTemplate(): Promise<Template> {
  const stored = await chrome.storage.local.get(TEMPLATE_KEY);
  return readTemplate(stored[TEMPLATE_KEY]);
}

export async function saveTemplate(template: Template): Promise<void> {
  await chrome.storage.local.set({ [TEMPLATE_KEY]: template });
}

/** Empty progress is removed instead of stored. */
export async function saveProgress(ticketId: string, progress: Progress): Promise<void> {
  const key = progressKey(ticketId);
  if (progress.done.length === 0) await chrome.storage.local.remove(key);
  else await chrome.storage.local.set({ [key]: progress });
}
