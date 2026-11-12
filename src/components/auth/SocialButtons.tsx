'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { hasEnv } from '@/lib/utils';

type Provider = 'naver' | 'kakao' | 'google';

// ✅ 로그인 연동을 마친 뒤 해당 값만 true로 바꾸세요
const ENABLED: Record<Provider, boolean> = { naver: false, kakao: false, google: true };
const LABEL: Record<Provider, string> = { naver: '네이버', kakao: '카카오', google: 'Google' };

export default function SocialButtons({ next }: { next?: string | null }) {
  const [msg, setMsg] = useState('');

  async function start(p: Provider) {
    setMsg('');
    if (!ENABLED[p] || !hasEnv()) {
      return setMsg(`${LABEL[p]} 로그인은 준비 중이에요. 지금은 이메일로 이용해 주세요.`);
    }
    const q = next ? `?next=${encodeURIComponent(next)}` : '';

    // 네이버는 Supabase 기본 제공자가 아니라 별도 API Route로 처리 (연동 단계에서 추가)
    if (p === 'naver') {
      window.location.href = `/api/auth/naver${q}`;
      return;
    }
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: p,
      options: { redirectTo: `${window.location.origin}/auth/callback${q}` },
    });
    if (error) setMsg(error.message);
  }

  return (
    <div className="social">
      <button type="button" className="btn btn-naver btn-block" onClick={() => start('naver')}>
        <span className="sico sico-naver">N</span>네이버로 계속하기
      </button>
      <button type="button" className="btn btn-kakao btn-block" onClick={() => start('kakao')}>
        <span className="sico sico-kakao">K</span>카카오로 계속하기
      </button>
      <button type="button" className="btn btn-google btn-block" onClick={() => start('google')}>
        <span className="sico sico-google">G</span>Google로 계속하기
      </button>
      {msg && <p className="note" role="status">{msg}</p>}
    </div>
  );
}
