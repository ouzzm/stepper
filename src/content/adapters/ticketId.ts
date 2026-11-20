/** Pure helpers for reading ticket ids out of Azure DevOps markup. */

const TICKET_ID = /^\d{1,10}$/;
const WORK_ITEM_HREF = /\/_workitems\/edit\/(\d{1,10})(?:[/?#]|$)/;

/** "12345" -> "12345"; anything that is not a plain number -> undefined. */
export function ticketIdFromText(text: string | null | undefined): string | undefined {
  const value = text?.trim() ?? '';
  return TICKET_ID.test(value) ? value : undefined;
}

/** "/Project/_workitems/edit/67890" -> "67890". */
export function ticketIdFromHref(href: string | null | undefined): string | undefined {
  return href ? WORK_ITEM_HREF.exec(href)?.[1] : undefined;
}
