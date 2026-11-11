'use client';

import Link from 'next/link';
import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient, isSupabaseReady } from '@/lib/supabase/client';
import { SetupNotice, SocialButtons, roleHome, safeNext } from '@/components/auth/AuthParts';

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get('next'));
  const [err, setErr] = useState(params.get('error') ?? '');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr('');
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get('email') ?? '').trim().toLowerCase();
    const password = String(fd.get('password') ?? '');
    if (!email || !password) return setErr('이메일과 비밀번호를 입력해 주세요.');
    if (!isSupabaseReady) return setErr('Supabase 설정 후 로그인할 수 있어요.');

    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) {
      setLoading(false);
      if (error?.message.includes('Email not confirmed')) return setErr('이메일 인증이 완료되지 않았어요. 메일함을 확인해 주세요.');
      return setErr('이메일 또는 비밀번호가 올바르지 않아요.');
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_brand, is_creator, onboarded, status')
      .eq('id', data.user.id)
      .maybeSingle();

    if (profile?.status === 'suspended') {
      await supabase.auth.signOut();
      setLoading(false);
      return setErr('이용이 정지된 계정이에요. 고객센터로 문의해 주세요.');
    }

    router.replace(!profile?.onboarded ? '/onboarding' : next ?? roleHome(profile));
    router.refresh();
  }

  return (
    <section className="card auth-card">
      <div className="tabs">
        <button type="button" className="on">로그인</button>
        <Link href="/signup">회원가입</Link>
      </div>
      <SetupNotice />
      <SocialButtons next={next} />
      <div className="divider">또는 이메일로 로그인</div>
      <form onSubmit={onSubmit} noValidate>
        {err && <p className="err">{err}</p>}
        <div className="field">
          <label htmlFor="email">이메일</label>
          <input className="input" id="email" name="email" type="email" autoComplete="email" />
        </div>
        <div className="field">
          <label htmlFor="password">비밀번호</label>
          <input className="input" id="password" name="password" type="password" autoComplete="current-password" />
        </div>
        <button className="btn btn-primary btn-block" disabled={loading}>{loading ? '로그인 중…' : '로그인'}</button>
      </form>
      <p className="auth-foot">
        계정이 없으신가요? <Link href="/signup">회원가입</Link>
      </p>
    </section>
  );
}

export default function LoginPage() {
  return (
    <div className="auth-wrap">
      <Suspense fallback={<section className="card auth-card">불러오는 중…</section>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
