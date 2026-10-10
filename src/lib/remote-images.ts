// Hosts next/image may optimise - keep in sync with images.remotePatterns in
// next.config.mjs. Product image URLs are pasted in by admins and can point
// anywhere; next/image throws (crashing the page) for a host that isn't
// listed, so images from any other host are rendered unoptimised instead.
const OPTIMIZED_IMAGE_HOSTS = new Set(['res.cloudinary.com', 'images.weserv.nl']);

/** `unoptimized` prop for a next/image src: true when its host isn't allowlisted. */
export function isUnoptimizedImage(src: string | undefined): boolean {
  if (!src || src.startsWith('/')) return false; // local file
  try {
    return !OPTIMIZED_IMAGE_HOSTS.has(new URL(src).hostname);
  } catch {
    return true;
  }
}
