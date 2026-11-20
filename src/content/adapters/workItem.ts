import { mountIcon } from './mount.ts';
import { ticketIdFromHref } from './ticketId.ts';
import type { PageAdapter } from './types.ts';

/*
 * Work item form header. The type and id sit together:
 *   <div class="flex-row flex-noshrink">
 *     <span ...><span class="work-item-type-icon ..."></span></span>
 *     <a class="bolt-link" href="/Project/_workitems/edit/67890">ESCALATION 67890</a>
 *   </div>
 * Requiring the type icon next to the link keeps links in discussions and related work out.
 */
const HEADER_LINK = 'div.flex-noshrink:has(.work-item-type-icon) > a.bolt-link[href*="/_workitems/edit/"]';

export const workItemAdapter: PageAdapter = {
  scan(root, onOpen) {
    for (const link of root.querySelectorAll<HTMLAnchorElement>(HEADER_LINK)) {
      const ticketId = ticketIdFromHref(link.getAttribute('href'));
      const container = link.parentElement;
      if (ticketId && container) mountIcon(container, ticketId, onOpen);
    }
  },
};
