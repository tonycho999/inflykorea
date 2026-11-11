'use client';

import Link from 'next/link';
import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient, isSupabaseReady } from '@/lib/supabase/client';
import { RoleFields, SetupNotice, SocialButtons, parseRoles, roleHome } from '@/components/auth/AuthParts';

function SignupForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const [sentTo, setSentTo] = useState('');

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr('');
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get('name') ?? '').trim();
    const email = String(fd.get('email') ?? '').trim().toLowerCase();
    const password = String(fd.get('password') ?? '');
    const agree = fd.get('agree') === 'on';

    if (!name) return setErr('이름을 입력해 주세요.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setErr('올바른 이메일 주소를 입력해 주세요.');
    if (password.length < 8) return setErr('비밀번호는 8자 이상이어야 해요.');
    const r = parseRoles(fd);
    if ('error' in r) return setErr(r.error);
    if (!agree) return setErr('이용약관과 개인정보처리방침에 동의해 주세요.');
    if (!isSupabaseReady) return setErr('Supabase 설정 후 가입할 수 있어요.');

    setLoading(true);
    const supabase = createClient();
    // 역할 정보는 user_metadata에도 저장 → 이메일 인증 후 콜백에서 profiles 생성
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: { name, ...r.data },
      },
    });

    if (error) {
      setLoading(false);
      return setErr(error.message.includes('registered') ? '이미 가입된 이메일이에요. 로그인해 주세요.' : error.message);
    }
    // 이메일 인증 사용 시, 이미 가입된 이메일은 identities가 빈 배열로 옴
    if (data.user && data.user.identities?.length === 0) {
      setLoading(false);
      return setErr('이미 가입된 이메일이에요. 로그인해 주세요.');
    }

    if (data.session && data.user) {
      // 이메일 인증 OFF → 바로 로그인 상태
      await supabase.from('profiles').upsert({ id: data.user.id, name, email, ...r.data, onboarded: true });
      router.replace(roleHome(r.data));
      router.refresh();
      return;
    }
    setLoading(false);
    setSentTo(email);
  }

  if (sentTo) {
    return (
      <section className="card auth-card center">
        <div className="big-ico">📧</div>
        <h1 className="auth-title">메일함을 확인해 주세요</h1>
        <p className="muted"><b>{sentTo}</b>로 인증 메일을 보냈어요. 메일의 링크를 누르면 가입이 완료돼요.</p>
        <Link href="/login" className="btn btn-secondary btn-block" style={{ marginTop: 24 }}>로그인으로</Link>
      </section>
    );
  }

  return (
    <section className="card auth-card">
      <div className="tabs">
        <Link href="/login">로그인</Link>
        <button type="button" className="on">회원가입</button>
      </div>
      <SetupNotice />
      <SocialButtons />
      <div className="divider">또는 이메일로 가입</div>
      <form onSubmit={onSubmit} noValidate>
        {err && <p className="err">{err}</p>}
        <div className="row2">
          <div className="field">
            <label htmlFor="name">이름</label>
            <input className="input" id="name" name="name" maxLength={30} autoComplete="name" />
          </div>
          <div className="field">
            <label htmlFor="email">이메일</label>
            <input className="input" id="email" name="email" type="email" autoComplete="email" />
          </div>
        </div>
        <div className="field">
          <label htmlFor="password">비밀번호</label>
          <input className="input" id="password" name="password" type="password" autoComplete="new-password" />
          <span className="hint">8자 이상</span>
        </div>
        <RoleFields defaultRole={params.get('role')} />
        <label className="agree">
          <input type="checkbox" name="agree" />
          <span>
            <Link href="/terms" target="_blank">이용약관</Link>과 <Link href="/privacy" target="_blank">개인정보처리방침</Link>에 동의합니다 (필수)
          </span>
        </label>
        <button className="btn btn-primary btn-block" disabled={loading}>{loading ? '가입 중…' : '가입하기'}</button>
      </form>
    </section>
  );
}

export default function SignupPage() {
  return (
    <div className="auth-wrap">
      <Suspense fallback={<section className="card auth-card">불러오는 중…</section>}>
        <SignupForm />
      </Suspense>
    </div>
  );
}
