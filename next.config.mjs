/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    typedRoutes: true,
  },
  // Allow Next.js Image component to serve external URLs if needed in future
  images: {
    remotePatterns: [],
  },
  // Neon serverless driver requires WebSocket support — handled automatically
  // by @neondatabase/serverless on Vercel Edge / Node runtimes.
  serverExternalPackages: ['@neondatabase/serverless'],
};

export default nextConfig;
