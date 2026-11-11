'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { CHANNELS, hasEnv } from '@/lib/utils';
import SocialButtons from './SocialButtons';

const PHONE_RE = /^01[0-9]-?\d{3,4}-?\d{4}$/;
const URL_RE = /^https?:\/\/\S+\.\S+/;

export default function SignupForm({ defaultRole }: { defaultRole?: string }) {
  const router = useRouter();
  const [brand, setBrand] = useState(defaultRole === 'brand');
  const [creator, setCreator] = useState(defaultRole === 'creator');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const [sentTo, setSentTo] = useState('');

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr('');
    const fd = new FormData(e.currentTarget);
    const s = (k: string) => String(fd.get(k) ?? '').trim();
    const name = s('name');
    const email = s('email').toLowerCase();
    const password = String(fd.get('password') ?? '');

    if (!name) return setErr('이름을 입력해 주세요.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setErr('올바른 이메일 주소를 입력해 주세요.');
    if (password.length < 8) return setErr('비밀번호는 8자 이상이어야 해요.');
    if (!brand && !creator) return setErr('브랜드 또는 크리에이터 중 하나 이상 선택해 주세요.');
    if (brand && !s('company')) return setErr('회사/브랜드명을 입력해 주세요.');
    if (brand && !PHONE_RE.test(s('phone'))) return setErr('알림톡 받을 휴대폰 번호를 정확히 입력해 주세요.');
    if (creator && !URL_RE.test(s('channel_url'))) return setErr('채널 주소는 https:// 로 시작해야 해요.');
    if (fd.get('agree') !== 'on') return setErr('이용약관과 개인정보처리방침에 동의해 주세요.');
    if (!hasEnv()) return setErr('Supabase 설정 전이라 아직 가입할 수 없어요.');

    setLoading(true);
    const supabase = createClient();
    // metadata → DB 트리거(handle_new_user)가 profiles 행을 자동 생성
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: {
          name,
          is_brand: brand,
          is_creator: creator,
          company: brand ? s('company') : '',
          phone: brand ? s('phone').replace(/-/g, '') : '',
          channel_type: creator ? s('channel_type') : '',
          channel_url: creator ? s('channel_url') : '',
        },
      },
    });

    if (error) {
      setLoading(false);
      return setErr(error.message.includes('registered') ? '이미 가입된 이메일이에요. 로그인해 주세요.' : error.message);
    }
    if (data.user && data.user.identities?.length === 0) {
      setLoading(false);
      return setErr('이미 가입된 이메일이에요. 로그인해 주세요.');
    }
    if (data.session) {
      // 이메일 인증 OFF 설정이면 바로 로그인됨
      router.replace(brand ? '/brand/campaigns' : '/creator/campaigns');
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
        <p className="muted"><b>{sentTo}</b>로 인증 메일을 보냈어요. 링크를 누르면 가입이 완료돼요.</p>
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

      <SocialButtons />
      <div className="divider">또는 이메일로 가입</div>

      <form onSubmit={onSubmit} noValidate>
        {err && <p className="form-msg err" role="alert">{err}</p>}

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

        <div className="lbl">가입 유형 <span className="muted">(둘 다 선택 가능)</span></div>
        <div className="role-grid">
          <label className="role-opt">
            <input type="checkbox" checked={brand} onChange={(e) => setBrand(e.target.checked)} />
            <span><b>브랜드</b><small>제품 광고를 요청하는 회사·개인</small></span>
          </label>
          <label className="role-opt">
            <input type="checkbox" checked={creator} onChange={(e) => setCreator(e.target.checked)} />
            <span><b>크리에이터</b><small>블로거·인플루언서·유튜버</small></span>
          </label>
        </div>

        {brand && (
          <div className="row2">
            <div className="field">
              <label htmlFor="company">회사/브랜드명</label>
              <input className="input" id="company" name="company" maxLength={60} />
            </div>
            <div className="field">
              <label htmlFor="phone">알림톡 수신 휴대폰</label>
              <input className="input" id="phone" name="phone" inputMode="tel" placeholder="010-0000-0000" />
              <span className="hint">크리에이터 채팅 알림을 카카오톡으로 받아요</span>
            </div>
          </div>
        )}

        {creator && (
          <div className="row2">
            <div className="field">
              <label htmlFor="channel_type">주 채널</label>
              <select className="input" id="channel_type" name="channel_type">
                {CHANNELS.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="channel_url">채널 주소</label>
              <input className="input" id="channel_url" name="channel_url" placeholder="https://" />
            </div>
          </div>
        )}

        <label className="agree">
          <input type="checkbox" name="agree" />
          <span>
            <Link href="/terms" target="_blank">이용약관</Link>과{' '}
            <Link href="/privacy" target="_blank">개인정보처리방침</Link>에 동의합니다 (필수)
          </span>
        </label>

        <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
          {loading ? '가입 중…' : '가입하기'}
        </button>
      </form>
    </section>
  );
}
