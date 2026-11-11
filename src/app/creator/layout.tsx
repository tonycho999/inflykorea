import { requireRole } from '@/lib/auth';

export const runtime = 'edge';

export default async function CreatorLayout({ children }: { children: React.ReactNode }) {
  await requireRole('creator'); // 크리에이터가 아니면 /mypage?need=creator 로 이동
  return <>{children}</>;
}
