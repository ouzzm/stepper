import type { TicketStatus } from '../core/engine.ts';

const svg = (body: string) =>
  `<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">${body}</svg>`;

export const statusIcons: Record<TicketStatus, string> = {
  empty: svg('<circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="1.5"/>'),
  partial: svg(
    '<circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="1.5"/>' +
      '<path d="M8 2a6 6 0 0 0 0 12z" fill="currentColor"/>',
  ),
  complete: svg(
    '<circle cx="8" cy="8" r="7" fill="currentColor"/>' +
      '<path d="M4.8 8.2l2.2 2.2 4.2-4.6" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>',
  ),
};

export const undoIcon = svg(
  '<path d="M6 3.5L2.5 7 6 10.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<path d="M3 7h6.5a3.5 3.5 0 0 1 0 7H7" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
);

export const boxIcon = svg(
  '<rect x="2.5" y="2.5" width="11" height="11" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/>',
);

export const closeIcon = svg(
  '<path d="M4 4l8 8M12 4l-8 8" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
);

export const gearIcon = svg(
  '<circle cx="8" cy="8" r="2.2" fill="none" stroke="currentColor" stroke-width="1.4"/>' +
    '<path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M3.4 12.6l1.4-1.4M11.2 4.8l1.4-1.4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>',
);

export const statusLabels: Record<TicketStatus, string> = {
  empty: 'Steps: not started',
  partial: 'Steps: in progress',
  complete: 'Steps: all done',
};
