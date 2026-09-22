// Single source of truth for keyboard-layout detection and the shortcut legend,
// shared between the top settings bar, the About panel, and the splash screen.

import { t } from './i18n';

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
    { key: 'presets', label: t('shortcuts.tabs.presets'), icon: 'fa-solid fa-bookmark', shortcut: 'x' },
    { key: 'navigation', label: t('shortcuts.tabs.navigation'), icon: 'fa-solid fa-arrows-up-down-left-right', shortcut: layout === 'azerty' ? 'w' : 'z' },
    { key: 'palettes', label: t('shortcuts.tabs.palettes'), icon: 'fa-solid fa-palette', shortcut: 'n' },
    { key: 'palettePath', label: t('shortcuts.tabs.palettePath'), icon: 'fa-solid fa-sliders', shortcut: '' },
    { key: 'animation', label: t('shortcuts.tabs.animation'), icon: 'fa-solid fa-wave-square', shortcut: 'c' },
    { key: 'expmap', label: t('shortcuts.tabs.expmap'), icon: 'fa-solid fa-database', shortcut: '' },
    { key: 'video', label: t('shortcuts.tabs.video'), icon: 'fa-solid fa-video', shortcut: 'k' },
    { key: 'performance', label: t('shortcuts.tabs.performance'), icon: 'fa-solid fa-gauge-high', shortcut: 'v' },
    { key: 'about', label: t('shortcuts.tabs.about'), icon: 'fa-solid fa-circle-info', shortcut: 'i' },
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
    { label: t('shortcuts.groups.move'), keys: [t('shortcuts.keys.leftClick'), move.up, move.left, move.down, move.right] },
    { label: t('shortcuts.groups.rotate'), keys: [t('shortcuts.keys.rightClick'), move.rotateLeft, move.rotateRight] },
    { label: t('shortcuts.groups.zoom'), keys: [t('shortcuts.keys.wheel'), 'R', 'F'] },
    { label: t('shortcuts.groups.settings'), keys: getSettingsTabs(layout).filter(t => t.shortcut).map(t => t.shortcut.toUpperCase()) },
    { label: t('shortcuts.groups.snapshot'), keys: ['P', 'B'] },
  ];
}
