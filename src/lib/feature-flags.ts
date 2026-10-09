// Feature switches. Read from env at build time (NEXT_PUBLIC_ values are
// inlined into the browser bundle too), so changing one needs a redeploy.

/**
 * Phone-number login via WhatsApp OTP. OFF until the WhatsApp number is set
 * up - see docs/PHONE_LOGIN_SETUP.md. While off, the phone-login API routes
 * answer 404 and no phone UI is shown; email + password login is unaffected.
 */
export const PHONE_LOGIN_ENABLED = process.env.NEXT_PUBLIC_PHONE_LOGIN_ENABLED === 'true';
