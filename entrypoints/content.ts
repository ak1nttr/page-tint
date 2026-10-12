import { browser } from 'wxt/browser';
import { defineContentScript } from 'wxt/utils/define-content-script';
import type { BackgroundMessage, ContentMessage } from '@/lib/messages';
import { buildCss, OVERLAY_TAG } from '@/lib/render';
import type { Settings } from '@/lib/settings';

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_start',
  main() {
    // The background may inject this file again into tabs opened before install.
    const flag = globalThis as { __pageTint?: boolean };
    if (flag.__pageTint) return;
    flag.__pageTint = true;

    const root = document.documentElement;
    const style = document.createElement('style');
    const overlay = document.createElement(OVERLAY_TAG);
    let current: Settings | null = null;

    function pageBackground(): string {
      const transparent = (c: string) => c === 'rgba(0, 0, 0, 0)' || c === 'transparent';
      const html = getComputedStyle(root).backgroundColor;
      if (!transparent(html)) return html;
      const body = document.body ? getComputedStyle(document.body).backgroundColor : '';
      return body && !transparent(body) ? body : 'Canvas';
    }

    function render() {
      if (!current || !current.enabled) {
        style.remove();
        overlay.remove();
        return;
      }
      // Measure the page's own background before our rule overrides it.
      style.textContent = '';
      style.textContent = buildCss(current, pageBackground());
      if (!style.isConnected) root.append(style);
      if (current.tintStrength > 0) {
        if (!overlay.isConnected) root.append(overlay);
      } else {
        overlay.remove();
      }
    }

    function apply(settings: Settings | null) {
      current = settings;
      render();
    }

    // Some pages rewrite <html>'s children; put our nodes back if that happens.
    new MutationObserver(() => {
      if (current?.enabled && (!style.isConnected || (current.tintStrength > 0 && !overlay.isConnected))) render();
    }).observe(root, { childList: true });

    // Body (and its background) only exists after parsing.
    document.addEventListener('DOMContentLoaded', () => current?.enabled && render(), { once: true });

    browser.runtime.onMessage.addListener((msg: ContentMessage, _sender, sendResponse) => {
      if (msg.type === 'apply') apply(msg.settings);
      sendResponse(true);
    });

    const ask: BackgroundMessage = { type: 'get-for-sender' };
    browser.runtime.sendMessage(ask).then(apply, () => {});
  },
});
