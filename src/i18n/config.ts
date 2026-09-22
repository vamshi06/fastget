export const locales = ['en', 'hi'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'en';

// Language toggle doesn't change the URL — same routes render in either
// language based on this cookie, so it survives across navigations.
export const LOCALE_COOKIE = 'fastget_locale';

export function isLocale(value: string | undefined): value is Locale {
  return !!value && (locales as readonly string[]).includes(value);
}
