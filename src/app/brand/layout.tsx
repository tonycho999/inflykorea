import { requireRole } from '@/lib/auth';

export const runtime = 'edge';

export default async function BrandLayout({ children }: { children: React.ReactNode }) {
  await requireRole('brand'); // 브랜드가 아니면 /mypage?need=brand 로 이동
  return <>{children}</>;
}
