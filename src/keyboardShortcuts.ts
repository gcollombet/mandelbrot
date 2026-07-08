// Single source of truth for keyboard-layout detection and the shortcut legend,
// shared between the top settings bar, the About panel, and the splash screen.

export type KeyboardLayout = 'azerty' | 'qwerty';

export function getKeyboardLayout(): KeyboardLayout {
  const lang = typeof navigator !== 'undefined'
    ? (navigator.language || navigator.languages?.[0] || 'en')
    : 'en';
  return lang.startsWith('fr') || lang.startsWith('be') ? 'azerty' : 'qwerty';
}

export interface SettingsTabDef {
  key: string;
  label: string;
  icon: string;
  shortcut: string;
}

export function getSettingsTabs(layout: KeyboardLayout): SettingsTabDef[] {
  return [
    { key: 'presets', label: 'Presets', icon: 'fa-solid fa-bookmark', shortcut: 'x' },
    { key: 'navigation', label: 'Navigation', icon: 'fa-solid fa-arrows-up-down-left-right', shortcut: layout === 'azerty' ? 'w' : 'z' },
    { key: 'palettes', label: 'Palettes', icon: 'fa-solid fa-palette', shortcut: 'n' },
    { key: 'animation', label: 'Animation', icon: 'fa-solid fa-film', shortcut: 'c' },
    { key: 'performance', label: 'Performance', icon: 'fa-solid fa-gauge-high', shortcut: 'v' },
    { key: 'about', label: 'About', icon: 'fa-solid fa-circle-info', shortcut: 'i' },
  ];
}

export interface ShortcutGroup {
  label: string;
  keys: string[];
}

export function getShortcutGroups(layout: KeyboardLayout): ShortcutGroup[] {
  const move = layout === 'azerty'
    ? { up: 'Z', down: 'S', left: 'Q', right: 'D', rotateLeft: 'A', rotateRight: 'E' }
    : { up: 'W', down: 'S', left: 'A', right: 'D', rotateLeft: 'Q', rotateRight: 'E' };
  return [
    { label: 'Move', keys: ['Left clic', move.up, move.left, move.down, move.right] },
    { label: 'Rotate', keys: ['Right clic', move.rotateLeft, move.rotateRight] },
    { label: 'Zoom', keys: ['Wheel', 'R', 'F'] },
    { label: 'Settings', keys: getSettingsTabs(layout).map(t => t.shortcut.toUpperCase()) },
    { label: 'Snapshot', keys: ['P', 'B'] },
  ];
}
