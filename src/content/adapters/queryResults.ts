import { mountIcon, unmountIcon } from './mount.ts';
import { ticketIdFromText } from './ticketId.ts';
import type { PageAdapter } from './types.ts';

/*
 * Query results grid (bolt table). An id cell looks like:
 *   <td role="gridcell" aria-colindex="1" class="bolt-table-cell bolt-list-cell">
 *     <div class="bolt-table-cell-content flex-row flex-center"><span class="text-ellipsis">12345</span></div>
 *   </td>
 * The id column is found by its "ID" header so other numeric columns are never touched.
 */

const ID_HEADER_TEXT = 'ID';
/** Used when no "ID" header is found: the id column is the first one by default. */
const FALLBACK_COLINDEX = '1';

function idColumnIndexes(root: Document): Set<string> {
  const indexes = new Set<string>();
  for (const header of root.querySelectorAll('[role="columnheader"][aria-colindex]')) {
    if (header.textContent?.trim().toUpperCase() === ID_HEADER_TEXT) {
      const index = header.getAttribute('aria-colindex');
      if (index) indexes.add(index);
    }
  }
  if (indexes.size === 0) indexes.add(FALLBACK_COLINDEX);
  return indexes;
}

export const queryResultsAdapter: PageAdapter = {
  scan(root, onOpen) {
    const columns = idColumnIndexes(root);
    for (const cell of root.querySelectorAll('td.bolt-table-cell[role="gridcell"][aria-colindex]')) {
      const content = cell.querySelector(':scope > .bolt-table-cell-content');
      if (!content) continue;
      const ticketId = columns.has(cell.getAttribute('aria-colindex') ?? '')
        ? ticketIdFromText(content.querySelector(':scope > .text-ellipsis')?.textContent)
        : undefined;
      if (ticketId) mountIcon(content, ticketId, onOpen);
      else unmountIcon(content);
    }
  },
};
