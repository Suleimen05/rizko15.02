// Platform configuration for multi-platform support
import type { Platform, PlatformConfig } from '@/types';

export const PLATFORMS: Record<Platform, PlatformConfig> = {
  tiktok: {
    id: 'tiktok',
    name: 'TikTok',
    icon: '🎵',
    color: 'from-black to-[#00f2ea]',
    enabled: true,
  },
  instagram: {
    id: 'instagram',
    name: 'Instagram',
    icon: '📸',
    color: 'from-purple-500 via-pink-500 to-orange-500',
    enabled: false,
  },
  twitter: {
    id: 'twitter',
    name: 'Twitter / X',
    icon: '🐦',
    color: 'from-blue-400 to-blue-600',
    enabled: false,
  },
  reddit: {
    id: 'reddit',
    name: 'Reddit',
    icon: '🤖',
    color: 'from-orange-500 to-red-500',
    enabled: false,
  },
  discord: {
    id: 'discord',
    name: 'Discord',
    icon: '💬',
    color: 'from-indigo-500 to-purple-600',
    enabled: false,
  },
  telegram: {
    id: 'telegram',
    name: 'Telegram',
    icon: '✈️',
    color: 'from-sky-400 to-blue-500',
    enabled: false,
  },
  youtube: {
    id: 'youtube',
    name: 'YouTube',
    icon: '▶️',
    color: 'from-red-600 to-red-500',
    enabled: false,
  },
};

// Get enabled platforms only
export const getEnabledPlatforms = (): PlatformConfig[] => {
  return Object.values(PLATFORMS).filter(p => p.enabled);
};

// Get all platforms (for tabs display)
export const getAllPlatforms = (): PlatformConfig[] => {
  return Object.values(PLATFORMS);
};

// Get platform config by id
export const getPlatform = (id: Platform): PlatformConfig => {
  return PLATFORMS[id];
};
