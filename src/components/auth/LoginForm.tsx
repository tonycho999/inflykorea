'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { hasEnv } from '@/lib/utils';
import SocialButtons from './SocialButtons';

const ERRORS: Record<string, string> = {
  suspended: '이용이 정지된 계정이에요. 고객센터로 문의해 주세요.',
  auth: '인증에 실패했어요. 다시 시도해 주세요.',
};

export default function LoginForm({ next, initialError }: { next?: string; initialError?: string }) {
  const router = useRouter();
  const [err, setErr] = useState(initialError ? ERRORS[initialError] ?? initialError : '');
  const [loading, setLoading] = useState(false);
  const safeNext = next && next.startsWith('/') && !next.startsWith('//') ? next : null;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr('');
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get('email') ?? '').trim().toLowerCase();
    const password = String(fd.get('password') ?? '');

    if (!email || !password) return setErr('이메일과 비밀번호를 입력해 주세요.');
    if (!hasEnv()) return setErr('Supabase 설정 전이라 아직 로그인할 수 없어요.');

    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) {
      setLoading(false);
      return setErr(
        error?.message.toLowerCase().includes('not confirmed')
          ? '이메일 인증이 완료되지 않았어요. 메일함을 확인해 주세요.'
          : '이메일 또는 비밀번호가 올바르지 않아요.',
      );
    }

    const { data: p } = await supabase
      .from('profiles')
      .select('is_brand, is_creator, status')
      .eq('id', data.user.id)
      .single();

    if (p?.status === 'suspended') {
      await supabase.auth.signOut();
      setLoading(false);
      return setErr(ERRORS.suspended);
    }

    const dest =
      !p || (!p.is_brand && !p.is_creator)
        ? '/start'
        : safeNext ?? (p.is_brand ? '/brand/campaigns' : '/creator/campaigns');
    router.replace(dest);
    router.refresh();
  }

  return (
    <section className="card auth-card">
      <div className="tabs">
        <button type="button" className="on">로그인</button>
        <Link href={safeNext ? `/signup?next=${encodeURIComponent(safeNext)}` : '/signup'}>회원가입</Link>
      </div>

      <SocialButtons next={safeNext} />
      <div className="divider">또는 이메일로 로그인</div>

      <form onSubmit={onSubmit} noValidate>
        {err && <p className="form-msg err" role="alert">{err}</p>}
        <div className="field">
          <label htmlFor="email">이메일</label>
          <input className="input" id="email" name="email" type="email" autoComplete="email" />
        </div>
        <div className="field">
          <label htmlFor="password">비밀번호</label>
          <input className="input" id="password" name="password" type="password" autoComplete="current-password" />
        </div>
        <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
          {loading ? '로그인 중…' : '로그인'}
        </button>
      </form>

      <p className="auth-foot">계정이 없으신가요? <Link href="/signup">회원가입</Link></p>
    </section>
  );
}
