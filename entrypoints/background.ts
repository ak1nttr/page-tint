import { browser, type Browser } from 'wxt/browser';
import { defineBackground } from 'wxt/utils/define-background';
import type { BackgroundMessage, ContentMessage, TabState } from '@/lib/messages';
import { PRESETS, storageKey, type Scope, type Settings } from '@/lib/settings';

// Settings live in session storage: they survive the service worker sleeping,
// but are gone when the browser closes. Nothing is kept per site on purpose.

const CONTENT_SCRIPT = '/content-scripts/content.js';

async function read(scope: Scope, id: number): Promise<Settings | null> {
  const key = storageKey(scope, id);
  const stored = await browser.storage.session.get(key);
  return (stored[key] as Settings | undefined) ?? null;
}

async function write(scope: Scope, id: number, settings: Settings | null) {
  const key = storageKey(scope, id);
  if (settings) await browser.storage.session.set({ [key]: settings });
  else await browser.storage.session.remove(key);
}

async function stateFor(tabId: number, windowId: number): Promise<TabState> {
  const [tab, window] = await Promise.all([read('tab', tabId), read('window', windowId)]);
  return { tab, window };
}

/** A tab's own settings win over its window's. */
async function effective(tabId: number, windowId: number): Promise<Settings | null> {
  const { tab, window } = await stateFor(tabId, windowId);
  return tab ?? window;
}

async function send(tabId: number, msg: ContentMessage): Promise<boolean> {
  try {
    await browser.tabs.sendMessage(tabId, msg);
    return true;
  } catch {
    return false;
  }
}

/** Make sure the tab has our content script. False for pages extensions can't touch (chrome://, Web Store…). */
async function ensureContent(tabId: number): Promise<boolean> {
  if (await send(tabId, { type: 'ping' })) return true;
  try {
    // Tabs that were open before install/update have no content script yet.
    // Once injected it asks for its settings itself.
    await browser.scripting.executeScript({ target: { tabId }, files: [CONTENT_SCRIPT] });
    return true;
  } catch {
    return false;
  }
}

async function push(tabId: number, windowId: number) {
  const settings = await effective(tabId, windowId);
  if (!(await send(tabId, { type: 'apply', settings })) && settings) await ensureContent(tabId);
}

async function pushScope(scope: Scope, tabId: number, windowId: number) {
  if (scope === 'tab') return push(tabId, windowId);
  const tabs = await browser.tabs.query({ windowId });
  await Promise.all(tabs.map((t) => t.id !== undefined && push(t.id, windowId)));
}

async function handle(msg: BackgroundMessage, sender: Browser.runtime.MessageSender): Promise<unknown> {
  switch (msg.type) {
    case 'get-for-sender': {
      const tab = sender.tab;
      if (tab?.id === undefined) return null;
      return effective(tab.id, tab.windowId);
    }
    case 'get-state':
      return stateFor(msg.tabId, msg.windowId);
    case 'ensure-content':
      return ensureContent(msg.tabId);
    case 'set':
      await write(msg.scope, msg.scope === 'tab' ? msg.tabId : msg.windowId, msg.settings);
      await pushScope(msg.scope, msg.tabId, msg.windowId);
      return true;
    case 'move': {
      // The settings belong to exactly one scope: moving to the window drops the
      // tab's own copy, moving to the tab takes them off the rest of the window.
      const from: Scope = msg.to === 'tab' ? 'window' : 'tab';
      await write(msg.to, msg.to === 'tab' ? msg.tabId : msg.windowId, msg.settings);
      await write(from, from === 'tab' ? msg.tabId : msg.windowId, null);
      await pushScope('window', msg.tabId, msg.windowId);
      return true;
    }
  }
}

async function toggleActiveTab() {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  if (tab?.id === undefined) return;
  const { tab: own, window } = await stateFor(tab.id, tab.windowId);
  if (own) {
    await write('tab', tab.id, { ...own, enabled: !own.enabled });
    await push(tab.id, tab.windowId);
  } else if (window) {
    await write('window', tab.windowId, { ...window, enabled: !window.enabled });
    await pushScope('window', tab.id, tab.windowId);
  } else {
    await write('tab', tab.id, PRESETS[0]!.settings);
    await push(tab.id, tab.windowId);
  }
}

export default defineBackground(() => {
  browser.runtime.onMessage.addListener((msg: BackgroundMessage, sender, sendResponse) => {
    handle(msg, sender).then(sendResponse, () => sendResponse(null));
    return true;
  });

  browser.commands.onCommand.addListener((command) => {
    if (command === 'toggle-tint') void toggleActiveTab();
  });

  // A tab dragged into another window follows that window's settings.
  browser.tabs.onAttached.addListener((tabId, info) => void push(tabId, info.newWindowId));

  browser.tabs.onRemoved.addListener((tabId) => void write('tab', tabId, null));
  browser.windows.onRemoved.addListener((windowId) => void write('window', windowId, null));
});
