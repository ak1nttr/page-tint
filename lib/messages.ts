import type { Scope, Settings } from './settings';

/** Messages handled by the background script. */
export type BackgroundMessage =
  | { type: 'get-for-sender' }
  | { type: 'get-state'; tabId: number; windowId: number }
  | { type: 'ensure-content'; tabId: number }
  | { type: 'set'; scope: Scope; tabId: number; windowId: number; settings: Settings | null }
  | { type: 'move'; to: Scope; tabId: number; windowId: number; settings: Settings };

/** Messages handled by the content script. */
export type ContentMessage = { type: 'ping' } | { type: 'apply'; settings: Settings | null };

export interface TabState {
  tab: Settings | null;
  window: Settings | null;
}
