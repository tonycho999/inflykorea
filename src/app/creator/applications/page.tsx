import type { Metadata } from 'next';
import Link from 'next/link';
import { requireRole } from '@/lib/auth';
import { brandLabel, getPublicProfiles, one } from '@/lib/queries';
import Empty from '@/components/Empty';
import { APP_STATUS, fmtDate } from '@/lib/utils';

export const runtime = 'edge';
export const metadata: Metadata = { title: '내 신청' };

type Camp = { id: string; title: string; brand_id: string; deadline: string; status: string };

export default async function MyApplicationsPage() {
  const { supabase, user } = await requireRole('creator');

  const { data } = await supabase
    .from('applications')
    .select('id, status, created_at, campaign_id, campaigns(id, title, brand_id, deadline, status)')
    .eq('creator_id', user.id)
    .order('created_at', { ascending: false });

  const list = (data ?? []).map((a) => ({ ...a, c: one(a.campaigns as Camp | Camp[] | null) }));
  const brands = await getPublicProfiles(supabase, list.map((a) => a.c?.brand_id));

  return (
    <div className="container page-wrap">
      <div className="page-head">
        <div>
          <h1>내 신청</h1>
          <p>신청한 캠페인의 선정 결과를 확인하세요. 선정되면 채팅방이 열려요.</p>
        </div>
      </div>

      {list.length === 0 ? (
        <div className="card">
          <Empty icon="📝" title="신청한 캠페인이 없어요" desc="관심 있는 캠페인을 찾아 신청해 보세요.">
            <Link href="/creator/campaigns" className="btn btn-primary">캠페인 찾기</Link>
          </Empty>
        </div>
      ) : (
        <div className="card p0">
          <div className="tbl-wrap">
            <table className="tbl">
              <thead><tr><th>캠페인</th><th>브랜드</th><th>신청일</th><th>상태</th><th className="num"></th></tr></thead>
              <tbody>
                {list.map((a) => {
                  const s = APP_STATUS[a.status];
                  return (
                    <tr key={a.id}>
                      <td><b>{a.c ? a.c.title : '(비공개된 캠페인)'}</b></td>
                      <td>{a.c ? brandLabel(brands.get(a.c.brand_id)) : '—'}</td>
                      <td>{fmtDate(a.created_at)}</td>
                      <td><span className={`badge ${s.cls}`}>{s.label}</span></td>
                      <td>
                        <div className="actions">
                          {a.status === 'approved' ? (
                            <Link href={`/chat/${a.id}`} className="btn btn-primary btn-sm">💬 채팅</Link>
                          ) : a.c ? (
                            <Link href={`/creator/campaigns/${a.c.id}`} className="btn btn-secondary btn-sm">보기</Link>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
