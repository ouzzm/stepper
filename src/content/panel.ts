import {
  answerQuestion,
  completeStep,
  summarize,
  undoLast,
  viewSteps,
  type StepView,
} from '../core/engine.ts';
import { OPEN_OPTIONS_MESSAGE } from '../core/messages.ts';
import type { Answer, Progress, Template } from '../core/model.ts';
import { boxIcon, closeIcon, gearIcon, statusIcons, undoIcon } from './icons.ts';
import css from './panel.css';
import { STATUS_ICON_ATTR } from './statusIcon.ts';
import { store } from './store.ts';

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className = '',
  children: (Node | string)[] = [],
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  node.append(...children);
  return node;
}

function iconButton(svg: string, label: string, className: string, onClick: () => void): HTMLButtonElement {
  const button = el('button', className);
  button.type = 'button';
  button.innerHTML = svg;
  button.title = label;
  button.setAttribute('aria-label', label);
  button.addEventListener('click', onClick);
  return button;
}

function iconSpan(svg: string, className: string): HTMLSpanElement {
  const span = el('span', className);
  span.innerHTML = svg;
  return span;
}

/** Next action for the keyboard: the current step (task row or Yes button), else undo, else close. */
const FOCUS_TARGET = '.step.current button, .step.last-done button, .close';

/** Slide-in panel on the right that shows and edits the steps of one ticket. */
class Panel {
  private host: HTMLElement | undefined;
  private root: ShadowRoot | undefined;
  private aside: HTMLElement | undefined;
  private ticketId: string | undefined;
  private error = '';

  constructor() {
    store.subscribe(() => this.render());
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && this.ticketId) this.close();
    });
    // Capture phase, so Azure handlers that stop propagation cannot keep the panel open.
    // A status icon is left out: clicking one switches the panel to that ticket.
    document.addEventListener(
      'pointerdown',
      (event) => {
        if (!this.ticketId) return;
        const inside = event
          .composedPath()
          .some((target) => target === this.host || (target instanceof Element && target.hasAttribute(STATUS_ICON_ATTR)));
        if (!inside) this.close();
      },
      true,
    );
  }

  open(ticketId: string): void {
    this.ticketId = ticketId;
    this.error = '';
    this.ensureHost();
    this.render();
    this.root?.querySelector<HTMLElement>(FOCUS_TARGET)?.focus();
  }

  close(): void {
    this.ticketId = undefined;
    const host = this.host;
    const aside = this.aside;
    if (host && aside) {
      // Slide out, then remove. The panel state is reset at once, so reopening during the
      // animation builds a fresh panel. The timeout covers reduced motion and background tabs.
      aside.classList.add('closing');
      const remove = () => host.remove();
      aside.addEventListener('animationend', remove, { once: true });
      setTimeout(remove, 300);
    }
    this.host = undefined;
    this.root = undefined;
    this.aside = undefined;
  }

  /** The panel shell is created once per opening so re-renders do not replay the slide-in. */
  private ensureHost(): void {
    if (this.host?.isConnected) return;
    this.host = document.createElement('div');
    this.host.setAttribute('data-stepper-panel', '');
    this.root = this.host.attachShadow({ mode: 'open' });
    const style = el('style');
    style.textContent = css;
    this.aside = el('aside', 'panel');
    this.aside.setAttribute('role', 'dialog');
    this.root.append(style, this.aside);
    document.documentElement.append(this.host);
  }

  private update(next: (template: Template, progress: Progress) => Progress): void {
    const ticketId = this.ticketId;
    if (!ticketId) return;
    const template = store.getTemplate();
    const progress = store.getProgress(ticketId);
    const result = next(template, progress);
    if (result === progress) return;
    this.error = '';
    store.setProgress(ticketId, result).catch((error: unknown) => {
      this.error = `Could not save: ${error instanceof Error ? error.message : String(error)}`;
      this.render();
    });
  }

  private render(): void {
    const ticketId = this.ticketId;
    const root = this.root;
    const aside = this.aside;
    if (!ticketId || !root || !aside) return;

    const template = store.getTemplate();
    const progress = store.getProgress(ticketId);
    const views = viewSteps(template, progress);
    const { status, doneCount, total } = summarize(template, progress);

    const header = el('header', '', [
      el('div', 'heading', [
        el('p', 'eyebrow', ['Ticket']),
        el('h2', '', [`#${ticketId}`]),
      ]),
      iconButton(gearIcon, 'Edit steps', 'icon', () => {
        void chrome.runtime.sendMessage(OPEN_OPTIONS_MESSAGE);
      }),
      iconButton(closeIcon, 'Close', 'icon close', () => this.close()),
    ]);

    const fill = el('span', status);
    fill.style.width = total === 0 ? '0' : `${(doneCount / total) * 100}%`;
    const progressRow = el('div', 'progress', [
      el('div', 'bar', [fill]),
      el('span', 'count', [total === 0 ? 'No steps' : `${doneCount} / ${total}`]),
    ]);

    const body: HTMLElement[] = [];
    if (views.length === 0) {
      const link = el('button', 'link', ['Add steps in settings']);
      link.type = 'button';
      link.addEventListener('click', () => void chrome.runtime.sendMessage(OPEN_OPTIONS_MESSAGE));
      body.push(el('div', 'empty', [el('p', '', ['No steps are defined yet.']), link]));
    } else {
      body.push(el('ol', 'steps', views.map((view) => this.renderStep(view))));
    }
    if (status === 'complete') body.push(el('p', 'done-note', [iconSpan(statusIcons.complete, ''), 'All steps are done.']));
    if (this.error) {
      const alert = el('p', 'error', [this.error]);
      alert.setAttribute('role', 'alert');
      body.push(alert);
    }

    const hadFocus = root.activeElement !== null;
    aside.setAttribute('aria-label', `Steps for ticket ${ticketId}`);
    aside.replaceChildren(header, progressRow, el('div', 'scroll', body));
    // Re-rendering drops the focused element; keep keyboard users on the next action.
    if (hadFocus) root.querySelector<HTMLElement>(FOCUS_TARGET)?.focus();
  }

  private renderStep(view: StepView): HTMLElement {
    const { node, state, depth, answer } = view;
    const item = el('li', `step ${state} ${node.kind}${depth > 0 ? ' nested' : ''}`);
    item.style.setProperty('--depth', String(depth));

    // The whole row is the action for the current task (complete) and the last done step (undo).
    let action: { label: string; hint: string; run: () => void } | undefined;
    if (state === 'last-done') {
      action = { label: `Undo: ${node.title}`, hint: 'Undo', run: () => this.update(undoLast) };
    } else if (state === 'current' && node.kind === 'task') {
      action = {
        label: `Mark as done: ${node.title}`,
        hint: 'Done',
        run: () => this.update((t, p) => completeStep(t, p, node.id)),
      };
    }

    let marker: HTMLElement;
    if (state === 'done') marker = iconSpan(statusIcons.complete, 'marker check');
    else if (state === 'last-done') marker = iconSpan(undoIcon, 'marker undo');
    else if (node.kind === 'question') marker = el('span', 'marker question', ['?']);
    else marker = iconSpan(boxIcon, 'marker box');

    const content = el('div', 'content', [el('p', 'title', [node.title])]);
    if (node.kind === 'question') {
      if (answer) {
        content.append(el('span', `chip ${answer}`, [answer === 'yes' ? 'Yes' : 'No']));
      } else if (state === 'current') {
        const answerButton = (value: Answer, text: string) => {
          const button = el('button', `answer ${value}`, [text]);
          button.type = 'button';
          button.addEventListener('click', () => this.update((t, p) => answerQuestion(t, p, node.id, value)));
          return button;
        };
        content.append(el('div', 'answers', [answerButton('yes', 'Yes'), answerButton('no', 'No')]));
      }
    }

    if (action) {
      const { label, hint, run } = action;
      const row = el('button', 'row', [marker, content, el('span', 'hint', [hint])]);
      row.type = 'button';
      row.setAttribute('aria-label', label);
      row.addEventListener('click', run);
      item.append(row);
    } else {
      item.append(el('div', 'row', [marker, content]));
    }
    return item;
  }
}

export const panel = new Panel();
