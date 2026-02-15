/**
 * Next.js 14 설정 (next-best-practices 스킬 반영)
 *
 * 참고 스킬:
 * - next-best-practices: file-conventions, bundling, image
 * - next-cache-components: cacheComponents (Next 16+), use cache (현재 14에서는 미사용)
 *
 * PWA: @ducanh2912/next-pwa (App Router 지원)
 * Cloudflare Pages: output: 'export' 사용 시 out/ 생성 → wrangler pages deploy
 */

const withPWA = require('@ducanh2912/next-pwa').default({
  dest: 'public',
  cacheOnFrontEndNav: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === 'development',
  workboxOptions: { disableDevLogs: true },
  runtimeCaching: [],
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Cloudflare Pages 정적 배포 시 주석 해제
  // output: 'export',

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },

  trailingSlash: false,
};

module.exports = withPWA(nextConfig);
