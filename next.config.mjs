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
  // Next.js injects inline bootstrap scripts; Razorpay checkout.js is remote.
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://checkout.razorpay.com",
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
  { key: 'Permissions-Policy', value: 'camera=(), microphone=()' },
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
    ];
  },
};

export default nextConfig;
