/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    typedRoutes: true,
  },
  // Allow Next.js Image component to serve external URLs if needed in future
  images: {
    remotePatterns: [],
  },
};

export default nextConfig;
