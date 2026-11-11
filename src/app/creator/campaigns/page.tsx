import type { Metadata } from 'next';
import Link from 'next/link';
import { requireRole } from '@/lib/auth';
import { brandLabel, getPublicProfiles } from '@/lib/queries';
import Empty from '@/components/Empty';
import { APP_STATUS, CHANNELS, dday, fmtDate, todayKST } from '@/lib/utils';

export const runtime = 'edge';
export const metadata: Metadata = { title: '캠페인 찾기' };

export default async function CreatorCampaignsPage({ searchParams }: { searchParams: { ch?: string } }) {
  const { supabase, user } = await requireRole('creator');
  const ch = searchParams.ch && CHANNELS.includes(searchParams.ch) ? searchParams.ch : null;

  let query = supabase
    .from('campaigns')
    .select('id, brand_id, title, reward, channels, slots, deadline, created_at')
    .eq('status', 'open')
    .gte('deadline', todayKST())
    .order('created_at', { ascending: false })
    .limit(60);
  if (ch) query = query.contains('channels', [ch]);
  const { data } = await query;
  const list = data ?? [];

  const brands = await getPublicProfiles(supabase, list.map((c) => c.brand_id));
  const { data: mine } = await supabase.from('applications').select('campaign_id, status').eq('creator_id', user.id);
  const myStatus = new Map((mine ?? []).map((a) => [a.campaign_id, a.status]));

  return (
    <div className="container page-wrap">
      <div className="page-head">
        <div>
          <h1>캠페인 찾기</h1>
          <p>모집 중인 캠페인에 신청하고 브랜드와 협업하세요.</p>
        </div>
        <nav className="filters" aria-label="채널 필터">
          <Link href="/creator/campaigns" className={!ch ? 'on' : ''}>전체</Link>
          {CHANNELS.map((x) => (
            <Link key={x} href={`/creator/campaigns?ch=${encodeURIComponent(x)}`} className={ch === x ? 'on' : ''}>{x}</Link>
          ))}
        </nav>
      </div>

      {list.length === 0 ? (
        <div className="card">
          <Empty icon="🔎" title="모집 중인 캠페인이 없어요"
            desc={ch ? '다른 채널을 선택해 보세요.' : '브랜드가 캠페인을 등록하면 이곳에 표시돼요.'} />
        </div>
      ) : (
        <div className="grid">
          {list.map((c) => {
            const st = myStatus.get(c.id);
            return (
              <Link key={c.id} href={`/creator/campaigns/${c.id}`} className="card ccard">
                <div className="ccard-top">
                  <span>{brandLabel(brands.get(c.brand_id))}</span>
                  {c.brand_id === user.id ? (
                    <span className="badge b-muted">내 캠페인</span>
                  ) : st ? (
                    <span className={`badge ${APP_STATUS[st].cls}`}>{APP_STATUS[st].label}</span>
                  ) : (
                    <span className="badge b-ok">{dday(c.deadline)}</span>
                  )}
                </div>
                <h3>{c.title}</h3>
                <div className="chips">{c.channels.map((x) => <span key={x} className="tag">{x}</span>)}</div>
                <div className="reward">🎁 {c.reward}</div>
                <div className="ccard-meta">
                  <span>모집 {c.slots}명</span>
                  <span>~ {fmtDate(c.deadline)}</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
