import { browser } from 'wxt/browser';
import type { BackgroundMessage, TabState } from '@/lib/messages';
import { DEFAULTS, PRESETS, type Blend, type Scope, type Settings } from '@/lib/settings';

type NumberField = 'brightness' | 'contrast' | 'warmth' | 'saturation' | 'tintStrength';
const NUMBER_FIELDS: NumberField[] = ['brightness', 'contrast', 'warmth', 'saturation', 'tintStrength'];

const $ = <T extends HTMLElement>(sel: string) => document.querySelector(sel) as T;
const controls = $<HTMLElement>('#controls');
const enabledBox = $<HTMLInputElement>('#enabled');
const invertBox = $<HTMLInputElement>('#invert');
const colorInput = $<HTMLInputElement>('#tintColor');

let tabId = 0;
let windowId = 0;
let scope: Scope = 'tab';
let settings: Settings = { ...DEFAULTS, enabled: false };
/** Whether `settings` are actually saved for `scope` (vs. just shown as a starting point). */
let stored = false;

function message<T>(msg: BackgroundMessage): Promise<T> {
  return browser.runtime.sendMessage(msg) as Promise<T>;
}

function render() {
  enabledBox.checked = settings.enabled;
  controls.classList.toggle('off', !settings.enabled);
  for (const field of NUMBER_FIELDS) {
    const row = $<HTMLElement>(`[data-field="${field}"]`);
    (row.querySelector('input[type="range"]') as HTMLInputElement).value = String(settings[field]);
    row.querySelector('output')!.textContent = `%${settings[field]}`;
  }
  invertBox.checked = settings.invert;
  colorInput.value = settings.tintColor;
  document.querySelectorAll<HTMLButtonElement>('[data-scope]').forEach((b) => {
    b.setAttribute('aria-checked', String(b.dataset.scope === scope));
  });
  document.querySelectorAll<HTMLButtonElement>('[data-blend]').forEach((b) => {
    b.setAttribute('aria-checked', String(b.dataset.blend === settings.tintBlend));
  });
}

// Slider drags fire many events; send only the latest once the previous one lands.
let sending = false;
let queued = false;
async function save() {
  if (sending) {
    queued = true;
    return;
  }
  sending = true;
  stored = true;
  await message({ type: 'set', scope, tabId, windowId, settings });
  sending = false;
  if (queued) {
    queued = false;
    void save();
  }
}

function update(patch: Partial<Settings>) {
  settings = { ...settings, enabled: true, ...patch };
  render();
  void save();
}

async function load() {
  const state = await message<TabState>({ type: 'get-state', tabId, windowId });
  scope = state.tab ? 'tab' : state.window ? 'window' : 'tab';
  const current = state.tab ?? state.window;
  stored = current !== null;
  settings = current ?? { ...DEFAULTS, enabled: false };
  render();
}

function bind() {
  enabledBox.addEventListener('change', () => {
    settings = { ...settings, enabled: enabledBox.checked };
    render();
    void save();
  });

  for (const field of NUMBER_FIELDS) {
    const row = $<HTMLElement>(`[data-field="${field}"]`);
    const slider = row.querySelector('input[type="range"]') as HTMLInputElement;
    slider.addEventListener('input', () => update({ [field]: Number(slider.value) }));
    row.addEventListener('dblclick', () => update({ [field]: DEFAULTS[field] }));
  }

  invertBox.addEventListener('change', () => update({ invert: invertBox.checked }));

  colorInput.addEventListener('input', () => {
    // Picking a colour with the layer at 0 would do nothing visible.
    update({ tintColor: colorInput.value, tintStrength: settings.tintStrength || 30 });
  });

  document.querySelectorAll<HTMLButtonElement>('[data-blend]').forEach((b) => {
    b.addEventListener('click', () => update({ tintBlend: b.dataset.blend as Blend }));
  });

  document.querySelectorAll<HTMLButtonElement>('[data-scope]').forEach((b) => {
    b.addEventListener('click', async () => {
      const to = b.dataset.scope as Scope;
      if (to === scope) return;
      scope = to;
      render();
      if (stored) await message({ type: 'move', to, tabId, windowId, settings });
    });
  });

  const presets = $<HTMLElement>('#presets');
  for (const preset of PRESETS) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = preset.label;
    button.addEventListener('click', () => update(preset.settings));
    presets.append(button);
  }

  $<HTMLButtonElement>('#reset').addEventListener('click', async () => {
    await message({ type: 'set', scope, tabId, windowId, settings: null });
    // Resetting the tab may reveal window settings underneath, so re-read.
    await load();
  });
}

async function init() {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  if (tab?.id === undefined) return;
  tabId = tab.id;
  windowId = tab.windowId;

  const reachable = await message<boolean>({ type: 'ensure-content', tabId });
  if (!reachable) {
    controls.hidden = true;
    enabledBox.disabled = true;
    $<HTMLElement>('#unsupported').hidden = false;
    return;
  }

  bind();
  await load();
}

void init();
