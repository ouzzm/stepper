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
  '<path d="M12.98 6.49L14.84 6.5L14.84 9.5L12.98 9.51L12.59 10.45L13.9 11.77L11.77 13.9L10.45 12.59L9.51 12.98L9.5 14.84L6.5 14.84L6.49 12.98L5.55 12.59L4.23 13.9L2.1 11.77L3.41 10.45L3.02 9.51L1.16 9.5L1.16 6.5L3.02 6.49L3.41 5.55L2.1 4.23L4.23 2.1L5.55 3.41L6.49 3.02L6.5 1.16L9.5 1.16L9.51 3.02L10.45 3.41L11.77 2.1L13.9 4.23L12.59 5.55z" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/>' +
    '<circle cx="8" cy="8" r="2.1" fill="none" stroke="currentColor" stroke-width="1.2"/>',
);

export const statusLabels: Record<TicketStatus, string> = {
  empty: 'Steps: not started',
  partial: 'Steps: in progress',
  complete: 'Steps: all done',
};
