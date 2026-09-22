import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';
import { defaultLocale, isLocale, LOCALE_COOKIE, type Locale } from './config';

// Namespace list is static (not built from a runtime variable) so bundlers
// can statically resolve each import path into its own context module.
async function loadMessages(locale: Locale) {
  const [
    common,
    nav,
    categories,
    footer,
    location,
    home,
    catalog,
    product,
    cart,
    checkout,
    order,
    account,
    auth,
    legal,
    support,
  ] = await Promise.all([
    import(`../../messages/${locale}/common.json`),
    import(`../../messages/${locale}/nav.json`),
    import(`../../messages/${locale}/categories.json`),
    import(`../../messages/${locale}/footer.json`),
    import(`../../messages/${locale}/location.json`),
    import(`../../messages/${locale}/home.json`),
    import(`../../messages/${locale}/catalog.json`),
    import(`../../messages/${locale}/product.json`),
    import(`../../messages/${locale}/cart.json`),
    import(`../../messages/${locale}/checkout.json`),
    import(`../../messages/${locale}/order.json`),
    import(`../../messages/${locale}/account.json`),
    import(`../../messages/${locale}/auth.json`),
    import(`../../messages/${locale}/legal.json`),
    import(`../../messages/${locale}/support.json`),
  ]);

  return {
    common: common.default,
    nav: nav.default,
    categories: categories.default,
    footer: footer.default,
    location: location.default,
    home: home.default,
    catalog: catalog.default,
    product: product.default,
    cart: cart.default,
    checkout: checkout.default,
    order: order.default,
    account: account.default,
    auth: auth.default,
    legal: legal.default,
    support: support.default,
  };
}

export default getRequestConfig(async () => {
  const cookieStore = cookies();
  const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value;
  const locale: Locale = isLocale(cookieLocale) ? cookieLocale : defaultLocale;

  return {
    locale,
    messages: await loadMessages(locale),
  };
});
