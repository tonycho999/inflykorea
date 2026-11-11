import { requireRole } from '@/lib/auth';

export const runtime = 'edge';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireRole('admin'); // is_admin이 아니면 홈으로
  return <>{children}</>;
}
