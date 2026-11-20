import { createStatusIcon, STATUS_ICON_ATTR } from '../statusIcon.ts';

/**
 * Keeps exactly one status icon for `ticketId` as the last child of `container`.
 * Azure DevOps recycles rows and headers, so an icon left from another ticket is replaced.
 */
export function mountIcon(container: Element, ticketId: string, onOpen: (ticketId: string) => void): void {
  const existing = container.querySelector(`:scope > [${STATUS_ICON_ATTR}]`);
  if (existing?.getAttribute(STATUS_ICON_ATTR) === ticketId) return;
  existing?.remove();
  container.append(createStatusIcon(ticketId, onOpen));
}

export function unmountIcon(container: Element): void {
  container.querySelector(`:scope > [${STATUS_ICON_ATTR}]`)?.remove();
}
