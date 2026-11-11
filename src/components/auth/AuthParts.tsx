'use client';

import { useState } from 'react';
import { createClient, isSupabaseReady } from '@/lib/supabase/client';

export const CHANNELS = ['블로그', '인스타그램', '유튜브', '틱톡'] as const;

export type RoleData = {
  is_brand: boolean;
  is_creator: boolean;
  company: string | null;
  phone: string | null;
  channel_type: string | null;
  channel_url: string | null;
};

/** 브랜드 우선, 없으면 크리에이터 홈 */
export function roleHome(r: { is_brand?: boolean; is_creator?: boolean }) {
  return r.is_brand ? '/brand/campaigns' : '/creator/campaigns';
}

/** 외부 사이트로 튕기는 open redirect 방지 */
export function safeNext(v: string | null) {
  return v && v.startsWith('/') && !v.startsWith('//') ? v : null;
}

export function parseRoles(fd: FormData): { error: string } | { data: RoleData } {
  const s = (k: string) => String(fd.get(k) ?? '').trim();
  const is_brand = fd.get('r_brand') === 'on';
  const is_creator = fd.get('r_creator') === 'on';
  if (!is_brand && !is_creator) return { error: '브랜드 또는 크리에이터 중 하나 이상 선택해 주세요.' };

  const data: RoleData = { is_brand, is_creator, company: null, phone: null, channel_type: null, channel_url: null };

  if (is_brand) {
    const phone = s('phone').replace(/-/g, '');
    if (!s('company')) return { error: '회사/브랜드명을 입력해 주세요.' };
    if (!/^01\d{8,9}$/.test(phone)) return { error: '알림톡 받을 휴대폰 번호를 정확히 입력해 주세요.' };
    data.company = s('company');
    data.phone = phone;
  }
  if (is_creator) {
    const url = s('ch_url');
    if (!/^https?:\/\/\S+\.\S+/.test(url)) return { error: '채널 주소를 https:// 로 시작하게 입력해 주세요.' };
    data.channel_type = s('ch_type');
    data.channel_url = url;
  }
  return { data };
}

export function SetupNotice() {
  if (isSupabaseReady) return null;
  return (
    <p className="note">
      ⚙️ Supabase 설정 전이에요. 환경 변수(<code>NEXT_PUBLIC_SUPABASE_URL</code>, <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>)를
      입력하고 다시 배포하면 동작해요.
    </p>
  );
}

export function RoleFields({ defaultRole }: { defaultRole?: string | null }) {
  const [brand, setBrand] = useState(defaultRole === 'brand');
  const [creator, setCreator] = useState(defaultRole === 'creator');

  return (
    <>
      <div className="lbl">
        가입 유형 <span className="muted">(둘 다 선택 가능)</span>
      </div>
      <div className="role-grid">
        <label className="role-opt">
          <input type="checkbox" name="r_brand" checked={brand} onChange={(e) => setBrand(e.target.checked)} />
          <span><b>브랜드</b><small>제품 광고를 요청하는 회사·개인</small></span>
        </label>
        <label className="role-opt">
          <input type="checkbox" name="r_creator" checked={creator} onChange={(e) => setCreator(e.target.checked)} />
          <span><b>크리에이터</b><small>블로거·인플루언서·유튜버</small></span>
        </label>
      </div>

      <div className="row2" hidden={!brand}>
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

      <div className="row2" hidden={!creator}>
        <div className="field">
          <label htmlFor="ch_type">주 채널</label>
          <select className="input" id="ch_type" name="ch_type">
            {CHANNELS.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="ch_url">채널 주소</label>
          <input className="input" id="ch_url" name="ch_url" placeholder="https://" />
        </div>
      </div>
    </>
  );
}

export function SocialButtons({ next }: { next?: string | null }) {
  const [err, setErr] = useState('');

  async function oauth(provider: 'kakao' | 'google') {
    setErr('');
    if (!isSupabaseReady) return setErr('Supabase 설정 후 사용할 수 있어요.');
    const supabase = createClient();
    const q = next ? `?next=${encodeURIComponent(next)}` : '';
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback${q}` },
    });
    if (error) setErr(error.message);
  }

  return (
    <div className="social">
      {/* 네이버는 Supabase 기본 제공자가 아니라 /api/auth/naver 로 별도 연동 예정 */}
      <button type="button" className="btn btn-naver btn-block" onClick={() => setErr('네이버 로그인은 연동 준비 중이에요.')}>
        <span className="sico sico-naver">N</span>네이버로 계속하기
      </button>
      <button type="button" className="btn btn-kakao btn-block" onClick={() => oauth('kakao')}>
        <span className="sico sico-kakao">K</span>카카오로 계속하기
      </button>
      <button type="button" className="btn btn-google btn-block" onClick={() => oauth('google')}>
        <span className="sico sico-google">G</span>Google로 계속하기
      </button>
      {err && <p className="err">{err}</p>}
    </div>
  );
}
