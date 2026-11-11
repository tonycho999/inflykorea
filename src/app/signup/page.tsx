import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import SignupForm from '@/components/auth/SignupForm';
import { getCurrent } from '@/lib/auth';

export const runtime = 'edge';

export const metadata: Metadata = {
  title: '회원가입',
  description: '브랜드 또는 크리에이터로 inflykorea에 가입하세요. 한 계정으로 두 역할을 모두 이용할 수 있어요.',
  alternates: { canonical: '/signup' },
};

export default async function SignupPage({
  searchParams,
}: {
  searchParams: { role?: string };
}) {
  const { profile } = await getCurrent();

  if (profile && profile.status === 'active') {
    if (!profile.is_brand && !profile.is_creator) redirect('/start');
    redirect(profile.is_brand ? '/brand/campaigns' : '/creator/campaigns');
  }

  // 랜딩의 "브랜드로 시작하기" / "크리에이터로 시작하기" 버튼에서 넘어온 값
  const role = searchParams.role === 'brand' || searchParams.role === 'creator' ? searchParams.role : undefined;

  return (
    <div className="auth-wrap">
      <SignupForm defaultRole={role} />
    </div>
  );
}
