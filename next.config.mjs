/** @type {import('next').NextConfig} */

const isProd = process.env.NODE_ENV === 'production';

// Content-Security-Policy (M1). Shipped Report-Only first: it reports violations
// without breaking anything, so the allowlist (notably Razorpay's checkout, which
// injects scripts + iframes) can be validated against real traffic before the
// policy is enforced. Flip the header key to 'Content-Security-Policy' to enforce.
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  // Next.js injects inline bootstrap scripts; Razorpay checkout.js is remote, and
  // checkout.js itself lazy-loads a risk-detection bundle from cdn.razorpay.com.
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://checkout.razorpay.com https://cdn.razorpay.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob: https://res.cloudinary.com https://*.razorpay.com",
  "connect-src 'self' https://*.razorpay.com https://lumberjack.razorpay.com",
  "frame-src 'self' https://*.razorpay.com",
  "form-action 'self' https://*.razorpay.com",
].join('; ');

const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Razorpay's fraud-detection iframe reads device motion sensors for risk
  // scoring — allow self + Razorpay's own origins, deny everything else.
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), accelerometer=(self "https://api.razorpay.com" "https://checkout.razorpay.com"), gyroscope=(self "https://api.razorpay.com" "https://checkout.razorpay.com")' },
  { key: 'Content-Security-Policy-Report-Only', value: csp },
];

// HSTS only in production — sending it on localhost would force the browser to
// upgrade http://localhost to https and break local dev.
if (isProd) {
  securityHeaders.push({
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains',
  });
}

const nextConfig = {
  experimental: {
    typedRoutes: true,
    // Run src/instrumentation.ts at server startup (validates required env vars).
    // Stable/default in Next 15; opt-in on Next 14.
    instrumentationHook: true,
  },
  // Allow Next.js Image component to serve external URLs if needed in future
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
      // Capability-token surfaces (M6): the status/update token sits in the URL,
      // so send no Referer at all from these pages/routes (defense-in-depth on
      // top of the global strict-origin-when-cross-origin policy). A later
      // matching rule overrides the global Referrer-Policy for these paths.
      {
        source: '/.well-known/assetlinks.json',
        headers: [{ key: 'Content-Type', value: 'application/json' }],
      },
      {
        source: '/order/:path*',
        headers: [{ key: 'Referrer-Policy', value: 'no-referrer' }],
      },
      {
        source: '/api/orders/:path*',
        headers: [{ key: 'Referrer-Policy', value: 'no-referrer' }],
      },
      {
        source: '/api/invoice/:path*',
        headers: [{ key: 'Referrer-Policy', value: 'no-referrer' }],
      },
      // Keep the admin panel out of search indexes (L3).
      {
        source: '/admin/:path*',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      },
    ];
  },

};

export default nextConfig;
