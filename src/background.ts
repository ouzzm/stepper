import { OPEN_OPTIONS_MESSAGE } from './core/messages.ts';

const CONTENT_SCRIPT_ID = 'stepper-content';

/** Registers the content script on exactly the hosts the user granted in settings. */
async function syncContentScript(): Promise<void> {
  const { origins = [] } = await chrome.permissions.getAll();
  const registered = await chrome.scripting.getRegisteredContentScripts({ ids: [CONTENT_SCRIPT_ID] });
  if (registered.length > 0) await chrome.scripting.unregisterContentScripts({ ids: [CONTENT_SCRIPT_ID] });
  if (origins.length === 0) return;
  await chrome.scripting.registerContentScripts([
    {
      id: CONTENT_SCRIPT_ID,
      matches: origins,
      js: ['content.js'],
      runAt: 'document_idle',
      persistAcrossSessions: true,
    },
  ]);
}

function sync(): void {
  syncContentScript().catch((error: unknown) => console.error('[Stepper] Content script sync failed', error));
}

chrome.runtime.onInstalled.addListener(sync);
chrome.runtime.onStartup.addListener(sync);
chrome.permissions.onAdded.addListener(sync);
chrome.permissions.onRemoved.addListener(sync);

chrome.action.onClicked.addListener(() => {
  void chrome.runtime.openOptionsPage();
});

chrome.runtime.onMessage.addListener((message: unknown) => {
  if (message === OPEN_OPTIONS_MESSAGE) void chrome.runtime.openOptionsPage();
});
