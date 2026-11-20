import { summarize } from '../core/engine.ts';
import { statusIcons, statusLabels } from './icons.ts';
import { store } from './store.ts';
import css from './statusIcon.css';

export const STATUS_ICON_ATTR = 'data-stepper-ticket';

interface MountedIcon {
  host: HTMLElement;
  button: HTMLButtonElement;
  ticketId: string;
}

const mounted = new Set<MountedIcon>();

function paint(icon: MountedIcon): void {
  const { status, doneCount, total } = summarize(store.getTemplate(), store.getProgress(icon.ticketId));
  icon.button.className = status;
  icon.button.innerHTML = statusIcons[status];
  const label = `${statusLabels[status]} (${doneCount}/${total})`;
  icon.button.title = label;
  icon.button.setAttribute('aria-label', label);
}

/**
 * Status button for one ticket. It lives in a shadow root so Azure DevOps styles
 * do not leak in, and it swallows pointer events so the host row is not opened.
 */
export function createStatusIcon(ticketId: string, onOpen: (ticketId: string) => void): HTMLElement {
  const host = document.createElement('span');
  host.setAttribute(STATUS_ICON_ATTR, ticketId);
  host.style.display = 'inline-flex';
  host.style.verticalAlign = 'middle';
  const root = host.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = css;
  const button = document.createElement('button');
  button.type = 'button';
  root.append(style, button);

  for (const type of ['pointerdown', 'mousedown', 'mouseup', 'dblclick', 'keydown'] as const) {
    host.addEventListener(type, (event) => event.stopPropagation());
  }
  host.addEventListener('click', (event) => {
    event.stopPropagation();
    event.preventDefault();
    onOpen(ticketId);
  });

  const icon: MountedIcon = { host, button, ticketId };
  mounted.add(icon);
  paint(icon);
  return host;
}

export function refreshStatusIcons(): void {
  for (const icon of mounted) {
    if (icon.host.isConnected) paint(icon);
    else mounted.delete(icon);
  }
}
