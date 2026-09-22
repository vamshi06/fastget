'use server';

import { cookies } from 'next/headers';
import { LOCALE_COOKIE, locales, type Locale } from './config';

export async function setLocale(locale: Locale) {
  if (!locales.includes(locale)) return;
  cookies().set(LOCALE_COOKIE, locale, {
    maxAge: 60 * 60 * 24 * 365,
    path: '/',
    sameSite: 'lax',
  });
}
