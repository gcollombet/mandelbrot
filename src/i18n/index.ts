import { createI18n } from 'vue-i18n';

export const SUPPORTED_LOCALES = ['en', 'fr'] as const;
export type AppLocale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: AppLocale = 'en';
const STORAGE_KEY = 'mandelbrot_locale';

type MessageTree = Record<string, unknown>;

/**
 * Every `src/locales/<locale>/<namespace>.json` file becomes the `<namespace>`
 * subtree of that locale, so each component owns its own file and keys are
 * addressed as `namespace.key`. Both locales must expose the same key set.
 */
function loadMessages(): Record<AppLocale, MessageTree> {
  const files = import.meta.glob<{ default: MessageTree }>('../locales/*/*.json', { eager: true });
  const messages: Record<AppLocale, MessageTree> = { en: {}, fr: {} };
  for (const [path, mod] of Object.entries(files)) {
    const match = /\/locales\/([^/]+)\/([^/]+)\.json$/.exec(path);
    if (!match) continue;
    const [, locale, namespace] = match;
    if (!(SUPPORTED_LOCALES as readonly string[]).includes(locale)) continue;
    messages[locale as AppLocale][namespace] = mod.default;
  }
  return messages;
}

function isSupported(value: unknown): value is AppLocale {
  return typeof value === 'string' && (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

/** Stored choice wins; otherwise English (the product default, whatever the browser language). */
export function readStoredLocale(): AppLocale {
  try {
    const stored = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    if (isSupported(stored)) return stored;
  } catch {
    // Private mode or blocked storage: fall through to the default.
  }
  return DEFAULT_LOCALE;
}

export const i18n = createI18n({
  legacy: false,
  locale: readStoredLocale(),
  fallbackLocale: DEFAULT_LOCALE,
  messages: loadMessages(),
  warnHtmlMessage: false,
  missingWarn: import.meta.env.DEV,
  fallbackWarn: false,
});

/** Global translator for plain TypeScript modules (engine errors, statuses…). */
export function t(key: string, named?: Record<string, unknown> | number, plural?: number): string {
  const tr = i18n.global.t as (...a: unknown[]) => string;
  if (named === undefined) return tr(key);
  if (plural === undefined) return tr(key, named);
  return tr(key, named, plural);
}

export function getLocale(): AppLocale {
  return i18n.global.locale.value as AppLocale;
}

export function setLocale(locale: AppLocale): void {
  if (!isSupported(locale)) return;
  i18n.global.locale.value = locale;
  try {
    localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    // Storage unavailable: the choice simply does not persist.
  }
  if (typeof document !== 'undefined') document.documentElement.lang = locale;
}

if (typeof document !== 'undefined') document.documentElement.lang = i18n.global.locale.value;
