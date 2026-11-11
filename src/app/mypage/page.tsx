import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { updateProfile } from '@/app/actions';
import ActionForm, { SubmitButton } from '@/components/ActionForm';
import { CHANNELS, fmtDate, won } from '@/lib/utils';

export const runtime = 'edge';

export const metadata: Metadata = {
  title: '마이페이지',
  robots: { index: false, follow: false },
};

const PROVIDER: Record<string, string> = {
  email: '이메일',
  kakao: '카카오',
  google: '구글',
  naver: '네이버',
};

type Props = { searchParams: { need?: string } };

export default async function MyPage({ searchParams }: Props) {
  const { user, profile: p } = await requireUser();
  if (!p.is_brand && !p.is_creator) redirect('/start');

  const need = searchParams.need === 'brand' || searchParams.need === 'creator' ? searchParams.need : null;
  const providerKey = String(user.app_metadata?.provider ?? 'email');
  const provider = PROVIDER[providerKey] ?? '이메일';

  const needMsg =
    need === 'brand'
      ? '👉 브랜드 기능을 쓰려면 아래에서 "브랜드"를 체크하고 회사명과 알림톡 번호를 입력한 뒤 저장하세요.'
      : need === 'creator'
        ? '👉 캠페인에 신청하려면 아래에서 "크리에이터"를 체크하고 채널 정보를 입력한 뒤 저장하세요.'
        : null;

  return (
    <div className="container page-wrap">
      <div className="page-head">
        <div>
          <h1>마이페이지</h1>
          <p>회원 정보와 이용 유형(브랜드·크리에이터)을 관리해요.</p>
        </div>
      </div>

      {needMsg ? <p className="form-msg notice" role="status">{needMsg}</p> : null}

      <div className="mypage-grid">
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
              <input className="input" id="phone" name="phone" inputMode="tel" placeholder="010-0000-0000" defaultValue={p.phone ?? ''} />
              <span className="hint">크리에이터가 채팅을 보내면 카카오톡으로 알려드려요 (연동 예정)</span>
            </div>
          </div>

          <div className="row2 creator-extra">
            <div className="field">
              <label htmlFor="channel_type">주 채널</label>
              <select className="input" id="channel_type" name="channel_type" defaultValue={p.channel_type ?? CHANNELS[0]}>
                {CHANNELS.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="channel_url">채널 주소</label>
              <input className="input" id="channel_url" name="channel_url" placeholder="https://" defaultValue={p.channel_url ?? ''} />
            </div>
          </div>

          <p className="hint" style={{ marginBottom: 16 }}>
            역할 체크를 해제해도 기존 캠페인·신청 내역과 충전 잔액은 그대로 남아요.
          </p>

          <div className="form-actions">
            <SubmitButton pendingText="저장 중…">저장</SubmitButton>
          </div>
        </ActionForm>

        <aside className="stack">
          <section className="card">
            <h2 className="sec-title">계정 정보</h2>
            <dl className="kv">
              <dt>가입 경로</dt>
              <dd>{provider}</dd>
              <dt>가입일</dt>
              <dd>{fmtDate(p.created_at)}</dd>
              <dt>이용 유형</dt>
              <dd className="row-inline">
                {p.is_brand ? <span className="badge">브랜드</span> : null}
                {p.is_creator ? <span className="badge badge-accent">크리에이터</span> : null}
                {p.is_admin ? <span className="badge">관리자</span> : null}
              </dd>
            </dl>
          </section>

          {p.is_brand ? (
            <section className="card balance-card">
              <div className="small">충전 잔액</div>
              <div className="amt">{won(p.balance)}</div>
              <Link href="/brand/wallet" className="btn btn-white btn-sm" style={{ marginTop: 16 }}>
                충전·환불 관리
              </Link>
            </section>
          ) : null}

          <section className="card">
            <h2 className="sec-title">바로가기</h2>
            <ul className="link-list">
              {p.is_brand ? <li><Link href="/brand/campaigns">내 캠페인 →</Link></li> : null}
              {p.is_creator ? <li><Link href="/creator/applications">내 신청 →</Link></li> : null}
              <li><Link href="/chat">채팅 →</Link></li>
              <li><Link href="/terms">이용약관 →</Link></li>
              <li><Link href="/privacy">개인정보처리방침 →</Link></li>
            </ul>
            <p className="hint" style={{ marginTop: 12 }}>
              회원 탈퇴는 고객센터(help@inflykorea.com)로 요청해 주세요.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
