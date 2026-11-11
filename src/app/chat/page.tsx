import type { Metadata } from 'next';
import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { brandLabel, getPublicProfiles, one, personLabel } from '@/lib/queries';
import Empty from '@/components/Empty';
import { fmtDateTime } from '@/lib/utils';

export const runtime = 'edge';
export const metadata: Metadata = { title: '채팅' };

type Camp = { id: string; title: string; brand_id: string };
const SEL = 'id, creator_id, decided_at, campaigns(id, title, brand_id)';

export default async function ChatListPage() {
  const { supabase, user } = await requireUser();

  // 내가 브랜드로 등록한 캠페인
  const { data: own } = await supabase.from('campaigns').select('id').eq('brand_id', user.id);
  const ownIds = (own ?? []).map((c) => c.id);

  // 크리에이터로 선정된 방 + 브랜드로 선정한 방
  const [asCreator, asBrand] = await Promise.all([
    supabase.from('applications').select(SEL).eq('status', 'approved').eq('creator_id', user.id),
    ownIds.length
      ? supabase.from('applications').select(SEL).eq('status', 'approved').in('campaign_id', ownIds)
      : Promise.resolve({ data: [] as any[] }),
  ]);

  const byId = new Map<string, any>();
  [...(asCreator.data ?? []), ...(asBrand.data ?? [])].forEach((a) => byId.set(a.id, a));
  const rooms = Array.from(byId.values())
    .map((a) => ({ ...a, c: one(a.campaigns as Camp | Camp[] | null) }))
    .filter((a) => a.c);

  const roomIds = rooms.map((r) => r.id);
  const { data: msgs } = roomIds.length
    ? await supabase
        .from('messages')
        .select('application_id, body, created_at')
        .in('application_id', roomIds)
        .order('created_at', { ascending: false })
        .limit(500)
    : { data: [] as { application_id: string; body: string; created_at: string }[] };

  const last = new Map<string, { body: string; created_at: string }>();
  (msgs ?? []).forEach((m) => { if (!last.has(m.application_id)) last.set(m.application_id, m); });

  const people = await getPublicProfiles(supabase, rooms.flatMap((r) => [r.creator_id, r.c.brand_id]));

  const sorted = rooms
    .map((r) => {
      const iAmCreator = r.creator_id === user.id;
      const partner = iAmCreator ? brandLabel(people.get(r.c.brand_id)) : personLabel(people.get(r.creator_id));
      const lm = last.get(r.id);
      return { ...r, iAmCreator, partner, lm, t: lm?.created_at ?? r.decided_at ?? '' };
    })
    .sort((a, b) => (a.t < b.t ? 1 : -1));

  return (
    <div className="container page-wrap">
      <div className="page-head">
        <div>
          <h1>채팅</h1>
          <p>선정된 캠페인마다 브랜드와 크리에이터의 1:1 대화방이 열려요.</p>
        </div>
      </div>

      <div className="card p0">
        {sorted.length === 0 ? (
          <Empty icon="💬" title="대화가 없어요"
            desc="브랜드는 신청자를 선정하면, 크리에이터는 캠페인에 선정되면 채팅방이 열려요." />
        ) : (
          <ul className="conv-list">
            {sorted.map((r) => (
              <li key={r.id}>
                <Link href={`/chat/${r.id}`}>
                  <div className="avatar" aria-hidden="true">{r.partner.slice(0, 1)}</div>
                  <div className="conv-body">
                    <div className="row-inline">
                      <b>{r.partner}</b>
                      <span className={`badge ${r.iAmCreator ? 'b-muted' : ''}`}>{r.iAmCreator ? '크리에이터로' : '브랜드로'}</span>
                    </div>
                    <span className="small muted">{r.c.title}</span>
                    <span className="last">{r.lm ? r.lm.body : '대화를 시작해 보세요'}</span>
                  </div>
                  {r.lm && <time className="conv-time">{fmtDateTime(r.lm.created_at)}</time>}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
