'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient, isSupabaseReady } from '@/lib/supabase/client';
import { RoleFields, SetupNotice, parseRoles, roleHome } from '@/components/auth/AuthParts';

export default function OnboardingPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [userId, setUserId] = useState('');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isSupabaseReady) return setReady(true);
    const supabase = createClient();
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.replace('/login?next=/onboarding');

      const { data: profile } = await supabase
        .from('profiles')
        .select('is_brand, is_creator, onboarded')
        .eq('id', user.id)
        .maybeSingle();
      if (profile?.onboarded) return router.replace(roleHome(profile));

      const m = user.user_metadata ?? {};
      setUserId(user.id);
      setEmail(user.email ?? '');
      setName(m.name ?? m.full_name ?? m.nickname ?? m.preferred_username ?? '');
      setReady(true);
    })();
  }, [router]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr('');
    const fd = new FormData(e.currentTarget);
    const n = String(fd.get('name') ?? '').trim();
    if (!n) return setErr('이름을 입력해 주세요.');
    const r = parseRoles(fd);
    if ('error' in r) return setErr(r.error);
    if (fd.get('agree') !== 'on') return setErr('이용약관과 개인정보처리방침에 동의해 주세요.');
    if (!isSupabaseReady || !userId) return setErr('Supabase 설정 후 사용할 수 있어요.');

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase
      .from('profiles')
      .upsert({ id: userId, name: n, email, ...r.data, onboarded: true });
    if (error) {
      setLoading(false);
      return setErr('저장 중 오류가 발생했어요. 잠시 후 다시 시도해 주세요.');
    }
    router.replace(roleHome(r.data));
    router.refresh();
  }

  if (!ready) return <div className="auth-wrap"><section className="card auth-card">불러오는 중…</section></div>;

  return (
    <div className="auth-wrap">
      <section className="card auth-card">
        <h1 className="auth-title">거의 다 됐어요! 👋</h1>
        <p className="muted" style={{ marginBottom: 20 }}>이용할 유형과 추가 정보를 입력해 주세요.</p>
        <SetupNotice />
        <form onSubmit={onSubmit} noValidate>
          {err && <p className="err">{err}</p>}
          <div className="row2">
            <div className="field">
              <label htmlFor="name">이름</label>
              <input className="input" id="name" name="name" maxLength={30} defaultValue={name} />
            </div>
            <div className="field">
              <label htmlFor="email">이메일</label>
              <input className="input" id="email" value={email} readOnly />
            </div>
          </div>
          <RoleFields />
          <label className="agree">
            <input type="checkbox" name="agree" />
            <span>
              <a href="/terms" target="_blank">이용약관</a>과 <a href="/privacy" target="_blank">개인정보처리방침</a>에 동의합니다 (필수)
            </span>
          </label>
          <button className="btn btn-primary btn-block" disabled={loading}>{loading ? '저장 중…' : '시작하기'}</button>
        </form>
      </section>
    </div>
  );
}
