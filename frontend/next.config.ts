// frontend/next.config.ts
import type { NextConfig } from 'next';
import withPWA from 'next-pwa';

const baseConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  // …add any other settings here…
};

const pwaConfig = withPWA({
  dest: 'public',
  disable: false,
  register: true,
  skipWaiting: true,
});

export default {
  ...baseConfig,
  ...pwaConfig,
};