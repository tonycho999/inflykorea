import type { MetadataRoute } from 'next';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://inflykorea.com').replace(/\/$/, '');

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*', // 네이버 Yeti, Googlebot 포함
        allow: '/',
        disallow: ['/admin', '/brand', '/creator', '/chat', '/mypage', '/onboarding', '/auth', '/api'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
