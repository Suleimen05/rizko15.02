/**
 * Image Proxy Utility
 *
 * Wraps TikTok/Instagram CDN URLs in our backend proxy to bypass CORS restrictions.
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/**
 * Wrap an image URL with a public image proxy to bypass CORS/referrer restrictions
 *
 * Using images.weserv.nl - a free, fast, and reliable image proxy service
 *
 * @param url - Original CDN URL from TikTok/Instagram
 * @returns Proxied URL through images.weserv.nl
 */
export function proxyImageUrl(url: string | null | undefined): string {
  // If no URL, return placeholder
  if (!url) {
    return '/placeholder-avatar.svg';
  }

  // If already a local/relative URL, return as is
  if (url.startsWith('/') || url.startsWith('data:') || url.includes('localhost')) {
    return url;
  }

  // If it's already proxied, return as is
  if (url.includes('images.weserv.nl') || url.includes('/api/proxy/image')) {
    return url;
  }

  // Use images.weserv.nl proxy - it bypasses CORS and works with TikTok/Instagram
  return `https://images.weserv.nl/?url=${encodeURIComponent(url)}`;
}

/**
 * Proxy a video thumbnail URL
 */
export function proxyThumbnailUrl(url: string | null | undefined): string {
  return proxyImageUrl(url);
}

/**
 * Proxy an avatar URL
 */
export function proxyAvatarUrl(url: string | null | undefined): string {
  return proxyImageUrl(url);
}
