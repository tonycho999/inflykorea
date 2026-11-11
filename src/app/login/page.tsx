import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import LoginForm from '@/components/auth/LoginForm';
import { getCurrent } from '@/lib/auth';

export const runtime = 'edge'; // Cloudflare Pages(next-on-pages) 필수

export const metadata: Metadata = {
  title: '로그인',
  alternates: { canonical: '/login' },
};

const safe = (v?: string) => (v && v.startsWith('/') && !v.startsWith('//') ? v : undefined);

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string; error?: string };
}) {
  const next = safe(searchParams.next);
  const { profile } = await getCurrent();

  // 이미 로그인한 회원은 바로 이동
  if (profile && profile.status === 'active') {
    if (!profile.is_brand && !profile.is_creator) redirect('/start');
    redirect(next ?? (profile.is_brand ? '/brand/campaigns' : '/creator/campaigns'));
  }

  return (
    <div className="auth-wrap">
      <LoginForm next={next} initialError={searchParams.error} />
    </div>
  );
}
