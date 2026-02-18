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

// PWA: npm install 실패 시 주석 해제 후 아래 nextConfig만 export
// const withPWA = require('@ducanh2912/next-pwa').default({ dest: 'public', disable: true });

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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

module.exports = nextConfig;
