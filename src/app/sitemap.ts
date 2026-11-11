import type { MetadataRoute } from 'next';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://inflykorea.com').replace(/\/$/, '');

type Freq = NonNullable<MetadataRoute.Sitemap[number]['changeFrequency']>;

// 로그인 없이 볼 수 있는 공개 페이지만 포함
const routes: { path: string; changeFrequency: Freq; priority: number }[] = [
  { path: '', changeFrequency: 'daily', priority: 1.0 },
  { path: '/signup', changeFrequency: 'monthly', priority: 0.6 },
  { path: '/login', changeFrequency: 'monthly', priority: 0.4 },
  { path: '/notices', changeFrequency: 'weekly', priority: 0.5 },
  { path: '/terms', changeFrequency: 'yearly', priority: 0.2 },
  { path: '/privacy', changeFrequency: 'yearly', priority: 0.2 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return routes.map((r) => ({
    url: `${SITE_URL}${r.path}`,
    lastModified: now,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));
}
