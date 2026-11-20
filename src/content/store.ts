import { emptyProgress } from '../core/engine.ts';
import type { Progress, Template } from '../core/model.ts';
import { readProgress, readTemplate, saveProgress, TEMPLATE_KEY, ticketIdFromKey } from '../core/storage.ts';

type Listener = () => void;

/** In-memory mirror of extension storage, kept in sync across tabs. */
class Store {
  private template: Template = readTemplate(undefined);
  private readonly progress = new Map<string, Progress>();
  private readonly listeners = new Set<Listener>();

  async init(): Promise<void> {
    const all = await chrome.storage.local.get(null);
    this.template = readTemplate(all[TEMPLATE_KEY]);
    for (const [key, value] of Object.entries(all)) this.applyProgress(key, value);

    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'local') return;
      for (const [key, change] of Object.entries(changes)) {
        if (key === TEMPLATE_KEY) this.template = readTemplate(change.newValue);
        else this.applyProgress(key, change.newValue);
      }
      this.notify();
    });
  }

  private applyProgress(key: string, raw: unknown): void {
    const ticketId = ticketIdFromKey(key);
    if (ticketId === undefined) return;
    const parsed = readProgress(raw);
    if (parsed) this.progress.set(ticketId, parsed);
    else this.progress.delete(ticketId);
  }

  getTemplate(): Template {
    return this.template;
  }

  getProgress(ticketId: string): Progress {
    return this.progress.get(ticketId) ?? emptyProgress();
  }

  async setProgress(ticketId: string, next: Progress): Promise<void> {
    const previous = this.progress.get(ticketId);
    this.progress.set(ticketId, next);
    this.notify();
    try {
      await saveProgress(ticketId, next);
    } catch (error) {
      if (previous) this.progress.set(ticketId, previous);
      else this.progress.delete(ticketId);
      this.notify();
      throw error;
    }
  }

  subscribe(listener: Listener): void {
    this.listeners.add(listener);
  }

  private notify(): void {
    for (const listener of this.listeners) listener();
  }
}

export const store = new Store();
