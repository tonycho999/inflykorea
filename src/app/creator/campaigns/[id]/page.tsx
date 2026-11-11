import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireRole } from '@/lib/auth';
import { applyCampaign } from '@/app/actions';
import { brandLabel, getPublicProfiles } from '@/lib/queries';
import ActionForm, { SubmitButton } from '@/components/ActionForm';
import { APP_STATUS, dday, fmtDate, todayKST } from '@/lib/utils';

export const runtime = 'edge';
export const metadata: Metadata = { title: '캠페인 상세' };

export default async function CampaignDetailPage({ params }: { params: { id: string } }) {
  const { supabase, user, profile } = await requireRole('creator');

  const { data: c } = await supabase
    .from('campaigns')
    .select('id, brand_id, title, product, reward, channels, slots, deadline, description, guide, status')
    .eq('id', params.id)
    .maybeSingle();
  if (!c || (c.status === 'hidden' && c.brand_id !== user.id)) notFound();

  const brands = await getPublicProfiles(supabase, [c.brand_id]);
  const { data: mine } = await supabase
    .from('applications')
    .select('id, status, created_at')
    .eq('campaign_id', c.id)
    .eq('creator_id', user.id)
    .maybeSingle();

  const isOpen = c.status === 'open' && c.deadline >= todayKST();
  const defaultCh = profile.channel_type && c.channels.includes(profile.channel_type) ? profile.channel_type : c.channels[0];

  let side: React.ReactNode;
  if (c.brand_id === user.id) {
    side = (
      <>
        <p className="muted">내가 등록한 캠페인에는 신청할 수 없어요.</p>
        <Link href={`/brand/campaigns/${c.id}/applicants`} className="btn btn-secondary btn-block" style={{ marginTop: 16 }}>
          신청자 관리로 이동
        </Link>
      </>
    );
  } else if (mine) {
    const s = APP_STATUS[mine.status];
    side = (
      <>
        <h2 className="sec-title">신청 완료</h2>
        <p>상태: <span className={`badge ${s.cls}`}>{s.label}</span></p>
        {mine.status === 'approved' ? (
          <Link href={`/chat/${mine.id}`} className="btn btn-primary btn-block" style={{ marginTop: 16 }}>💬 브랜드와 채팅</Link>
        ) : mine.status === 'pending' ? (
          <p className="hint" style={{ marginTop: 12 }}>브랜드가 검토 중이에요. 선정되면 채팅방이 열려요.</p>
        ) : null}
      </>
    );
  } else if (!isOpen) {
    side = <p className="muted">모집이 마감된 캠페인이에요.</p>;
  } else {
    side = (
      <ActionForm action={applyCampaign}>
        <h2 className="sec-title">캠페인 신청</h2>
        <input type="hidden" name="campaign_id" value={c.id} />
        <div className="field">
          <label htmlFor="channel_type">진행 채널</label>
          <select className="input" id="channel_type" name="channel_type" defaultValue={defaultCh}>
            {c.channels.map((x) => <option key={x}>{x}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="channel_url">채널 주소</label>
          <input className="input" id="channel_url" name="channel_url" placeholder="https://" defaultValue={profile.channel_url ?? ''} />
        </div>
        <div className="field">
          <label htmlFor="message">신청 메시지</label>
          <textarea className="input" id="message" name="message" rows={5} maxLength={1000}
            placeholder="채널 소개, 구독자·방문자 수, 콘텐츠 계획 등을 브랜드에게 알려 주세요." />
        </div>
        <SubmitButton className="btn btn-primary btn-block" pendingText="신청 중…">신청하기</SubmitButton>
      </ActionForm>
    );
  }

  return (
    <div className="container page-wrap">
      <Link href="/creator/campaigns" className="back">← 캠페인 목록</Link>
      <div className="detail-grid">
        <article className="card stack">
          <div>
            <span className="small muted">{brandLabel(brands.get(c.brand_id))}</span>
            <h1 className="detail-title">{c.title}</h1>
          </div>
          <dl className="kv">
            <dt>제품</dt><dd>{c.product}</dd>
            <dt>제공 내역</dt><dd>{c.reward}</dd>
            <dt>모집 채널</dt><dd>{c.channels.join(', ')}</dd>
            <dt>모집 인원</dt><dd>{c.slots}명</dd>
            <dt>마감일</dt><dd>{fmtDate(c.deadline)} ({dday(c.deadline)})</dd>
          </dl>
          <div>
            <h2 className="sec-title" style={{ marginBottom: 8 }}>상세 내용</h2>
            <p className="pre">{c.description}</p>
          </div>
          {c.guide && (
            <div>
              <h2 className="sec-title" style={{ marginBottom: 8 }}>콘텐츠 가이드</h2>
              <p className="pre">{c.guide}</p>
            </div>
          )}
          <p className="hint">
            ※ 제품이나 원고료를 받고 작성한 콘텐츠에는 &quot;광고&quot;, &quot;협찬&quot; 등을 반드시 표시해야 해요.
          </p>
        </article>
        <aside className="card">{side}</aside>
      </div>
    </div>
  );
}
