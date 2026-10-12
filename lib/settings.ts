/** How the tint layer mixes with the page. */
export type Blend = 'multiply' | 'screen' | 'normal';

export interface Settings {
  enabled: boolean;
  /** Percentages, 100 = unchanged. */
  brightness: number;
  contrast: number;
  saturation: number;
  /** Sepia amount 0–100. */
  warmth: number;
  /** Dark mode: invert colours, then flip images back. */
  invert: boolean;
  tintColor: string;
  /** Opacity of the tint layer 0–90. */
  tintStrength: number;
  tintBlend: Blend;
}

export type Scope = 'tab' | 'window';

export const DEFAULTS: Settings = {
  enabled: true,
  brightness: 100,
  contrast: 100,
  saturation: 100,
  warmth: 0,
  invert: false,
  tintColor: '#f3e2c0',
  tintStrength: 0,
  tintBlend: 'multiply',
};

export const PRESETS: { label: string; settings: Settings }[] = [
  { label: 'Loş', settings: { ...DEFAULTS, brightness: 75 } },
  {
    label: 'Kağıt',
    settings: { ...DEFAULTS, brightness: 95, warmth: 20, tintColor: '#f3e2c0', tintStrength: 45 },
  },
  { label: 'Gece', settings: { ...DEFAULTS, invert: true, brightness: 90, contrast: 95, warmth: 10 } },
  {
    label: 'Aydınlat',
    settings: { ...DEFAULTS, brightness: 125, contrast: 105, tintColor: '#ffffff', tintStrength: 12, tintBlend: 'screen' },
  },
];

export function storageKey(scope: Scope, id: number): string {
  return `${scope}:${id}`;
}
