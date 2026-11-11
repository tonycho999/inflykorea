import type { Metadata } from 'next';
import Link from 'next/link';
import { requireRole } from '@/lib/auth';
import { setCampaignStatus } from '@/app/actions';
import ConfirmButton from '@/components/ConfirmButton';
import Empty from '@/components/Empty';
import { campaignStatus, dday, fmtDate } from '@/lib/utils';

export const runtime = 'edge';
export const metadata: Metadata = { title: '내 캠페인' };

export default async function BrandCampaignsPage() {
  const { supabase, user } = await requireRole('brand');

  const { data } = await supabase
    .from('campaigns')
    .select('id, title, product, channels, slots, deadline, status, created_at')
    .eq('brand_id', user.id)
    .order('created_at', { ascending: false });
  const list = data ?? [];

  const ids = list.map((c) => c.id);
  const { data: apps } = ids.length
    ? await supabase.from('applications').select('campaign_id, status').in('campaign_id', ids)
    : { data: [] as { campaign_id: string; status: string }[] };
  const count = (id: string, st: string) =>
    (apps ?? []).filter((a) => a.campaign_id === id && a.status === st).length;

  return (
    <div className="container page-wrap">
      <div className="page-head">
        <div>
          <h1>내 캠페인</h1>
          <p>캠페인을 등록하고 신청한 크리에이터를 관리하세요.</p>
        </div>
        <Link href="/brand/campaigns/new" className="btn btn-primary">+ 새 캠페인 작성</Link>
      </div>

      {list.length === 0 ? (
        <div className="card">
          <Empty icon="📣" title="아직 등록한 캠페인이 없어요" desc="첫 캠페인을 작성해 크리에이터 모집을 시작해 보세요.">
            <Link href="/brand/campaigns/new" className="btn btn-primary">캠페인 작성하기</Link>
          </Empty>
        </div>
      ) : (
        <div className="card p0">
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>캠페인</th><th>상태</th><th>마감일</th>
                  <th className="num">대기 신청</th><th className="num">선정 / 모집</th><th className="num">관리</th>
                </tr>
              </thead>
              <tbody>
                {list.map((c) => {
                  const st = campaignStatus(c);
                  const pending = count(c.id, 'pending');
                  return (
                    <tr key={c.id}>
                      <td>
                        <b>{c.title}</b>
                        <div className="small muted">{c.product} · {c.channels.join(', ')}</div>
                      </td>
                      <td><span className={`badge ${st.cls || 'b-muted'}`}>{st.label}</span></td>
                      <td>{fmtDate(c.deadline)} <span className="small muted">{dday(c.deadline)}</span></td>
                      <td className="num">{pending ? <span className="badge b-warn">{pending}건</span> : '0건'}</td>
                      <td className="num">{count(c.id, 'approved')} / {c.slots}명</td>
                      <td>
                        <div className="actions">
                          <Link href={`/brand/campaigns/${c.id}/applicants`} className="btn btn-primary btn-sm">신청자 관리</Link>
                          {c.status !== 'hidden' && (
                            <Link href={`/brand/campaigns/${c.id}/edit`} className="btn btn-secondary btn-sm">수정</Link>
                          )}
                          {c.status === 'open' && (
                            <ConfirmButton action={setCampaignStatus} fields={{ id: c.id, status: 'closed' }}
                              label="마감" className="btn btn-ghost btn-sm"
                              confirmText="모집을 마감할까요? 더 이상 새 신청을 받지 않아요." />
                          )}
                          {c.status === 'closed' && (
                            <ConfirmButton action={setCampaignStatus} fields={{ id: c.id, status: 'open' }}
                              label="재개" className="btn btn-ghost btn-sm" />
                          )}
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
