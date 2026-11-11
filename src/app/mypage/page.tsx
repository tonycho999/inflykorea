import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { updateProfile } from '@/app/actions';
import ActionForm, { SubmitButton } from '@/components/ActionForm';
import { CHANNELS, fmtDate, won } from '@/lib/utils';

export const runtime = 'edge'; // Cloudflare Pages(next-on-pages) 필수

export const metadata: Metadata = {
  title: '마이페이지',
  robots: { index: false, follow: false },
};

const PROVIDER: Record<string, string> = { email: '이메일', kakao: '카카오', google: '구글', naver: '네이버' };

export default async function MyPage({
  searchParams,
}: {
  searchParams: { need?: string };
}) {
  const { user, profile: p } = await requireUser();

  // 소셜 첫 가입 후 역할을 아직 안 고른 회원
  if (!p.is_brand && !p.is_creator) redirect('/start');

  const need = searchParams.need === 'brand' || searchParams.need === 'creator' ? searchParams.need : null;
  const provider = PROVIDER[String(user.app_metadata?.provider ?? 'email')] ?? '이메일';

  return (
    <div className="container page-wrap">
      <div className="page-head">
        <div>
          <h1>마이페이지</h1>
          <p>회원 정보와 이용 유형(브랜드·크리에이터)을 관리해요.</p>
        </div>
      </div>

      {need && (
        <p className="form-msg notice" role="status">
          {need === 'brand'
            ? '👉 브랜드 기능을 쓰려면 아래에서 "브랜드"를 체크하고 회사명과 알림톡 번호를 입력한 뒤 저장하세요.'
            : '👉 캠페인에 신청하려면 아래에서 "크리에이터"를 체크하고 채널 정보를 입력한 뒤 저장하세요.'}
        </p>
      )}

      <div className="mypage-grid">
        {/* ---------- 프로필 수정 ---------- */}
        <ActionForm action={updateProfile} className="card profile-form">
          <h2 className="sec-title">프로필</h2>

          <div className="row2">
            <div className="field">
              <label htmlFor="name">이름</label>
              <input className="input" id="name" name="name" maxLength={30} defaultValue={p.name} />
            </div>
            <div className="field">
              <label htmlFor="email">이메일</label>
              <input className="input" id="email" value={p.email ?? ''} readOnly />
              <span className="hint">이메일은 변경할 수 없어요</span>
            </div>
          </div>

          <div className="lbl">이용 유형 <span className="muted">(둘 다 선택 가능)</span></div>
          <div className="role-grid">
            <label className="role-opt">
              <input type="checkbox" name="is_brand" defaultChecked={p.is_brand || need === 'brand'} />
              <span><b>브랜드</b><small>캠페인 등록·크리에이터 선정</small></span>
            </label>
            <label className="role-opt">
              <input type="checkbox" name="is_creator" defaultChecked={p.is_creator || need === 'creator'} />
              <span><b>크리에이터</b><small>캠페인 신청·콘텐츠 제작</small></span>
            </label>
          </div>

          <div className="row2 brand-extra">
            <div className="field">
              <label htmlFor="company">회사/브랜드명</label>
              <input className="input" id="company" name="company" maxLength={60} defaultValue={p.company ?? ''} />
            </div>
            <div className="field">
              <label htmlFor="phone">알림톡 수신 휴대폰</label>
              <input className="input" id="phone" name="phone" inputMode="tel" placeholder="010-0000-0000"
                defaultValue={p.phone ?? ''} />
              <span className="hint">크리에이터가 채팅을 보내면 카카오톡으로 알려드려요 (연동 예정)</span>
            </div>
          </div>

          <div className="row2 creator-extra">
            <div className="field">
              <label htmlFor="channel_type">주 채널</label>
              <select className="input" id="ch
