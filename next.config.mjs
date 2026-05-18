import withPWA from '@ducanh2912/next-pwa';

const pwaConfig = withPWA({
  dest: 'public',
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === 'development',
  workboxOptions: {
    // InjectManifest: our custom sw.js defines all caching strategies,
    // letting us use StaleWhileRevalidate for RSC payloads so pages
    // remain available offline for 30 days after the last online visit.
    swSrc: 'sw.js',
  },
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
};

export default pwaConfig(nextConfig);
