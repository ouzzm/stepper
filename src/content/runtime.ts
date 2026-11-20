import type { PageAdapter } from './adapters/types.ts';
import { panel } from './panel.ts';
import { refreshStatusIcons } from './statusIcon.ts';
import { store } from './store.ts';

/** Batches bursts of DOM changes (Azure re-renders often) into one scan. */
const SCAN_DELAY_MS = 50;

const openPanel =(ticketId: string) => panel.open(ticketId);

/** Azure DevOps renders lazily and navigates without reloads, so every adapter rescans on DOM changes. */
function startScanning(adapters: readonly PageAdapter[]): void {
  let scheduled = false;
  const scan = () => {
    scheduled = false;
    for (const adapter of adapters) adapter.scan(document, openPanel);
  };
  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    // A timer, not requestAnimationFrame: rAF stops in background tabs and the scan must still run.
    setTimeout(scan, SCAN_DELAY_MS);
  };
  // characterData and href: recycled rows and headers change text or links in place.
  new MutationObserver(schedule).observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ['href'],
  });
  scan();
}

export function startContent(adapters: readonly PageAdapter[]): void {
  // Guard against a second injection into the same page (e.g. extension reload).
  const flag = '__stepperLoaded';
  const globals = window as unknown as Record<string, unknown>;
  if (globals[flag]) return;
  globals[flag] = true;
  store
    .init()
    .then(() => {
      store.subscribe(refreshStatusIcons);
      startScanning(adapters);
    })
    .catch((error: unknown) => console.error('[Stepper] Could not load storage', error));
}
