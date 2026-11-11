import type { Metadata } from 'next';
import Link from 'next/link';
import { requireRole } from '@/lib/auth';
import { adminDeleteCampaign, adminSetCampaignStatus } from '@/app/actions';
import { one } from '@/lib/queries';
import ConfirmButton from '@/components/ConfirmButton';
import Empty from '@/components/Empty';
import { campaignStatus, fmtDate } from '@/lib/utils';

export const runtime = 'edge';
export const metadata: Metadata = { title: '캠페인 글 관리' };

const FILTERS = [
  { key: '', label: '전체' },
  { key: 'open', label: '모집중' },
  { key: 'closed', label: '마감' },
  { key: 'hidden', label: '숨김' },
];
type Brand = { name: string; company: string | null; email: string | null };

export default async function AdminCampaignsPage({ searchParams }: { searchParams: { s?: string } }) {
  const { supabase } = await requireRole('admin');
  const s = ['open', 'closed', 'hidden'].includes(searchParams.s ?? '') ? searchParams.s! : '';

  let query = supabase
    .from('campaigns')
    .select('id, title, product, reward, description, guide, status, deadline, created_at, profiles(name, company, email)')
    .order('created_at', { ascending: false })
    .limit(100);
  if (s) query = query.eq('status', s);
  const { data } = await query;
  const list = data ?? [];

  const ids = list.map((c) => c.id);
  const { data: apps } = ids.length
    ? await supabase.from('applications').select('campaign_id, status').in('campaign_id', ids)
    : { data: [] as { campaign_id: string; status: string }[] };
  const total = (id: string) => (apps ?? []).filter((a) => a.campaign_id === id).length;
  const approved = (id: string) => (apps ?? []).filter((a) => a.campaign_id === id && a.status === 'approved').length;

  return (
    <div className="container page-wrap">
      <div className="page-head">
        <div>
          <h1>캠페인 글 관리</h1>
          <p>브랜드가 작성한 모집 글을 검토하고, 문제가 있으면 숨기거나 삭제하세요. (최근 100건)</p>
        </div>
        <nav className="filters" aria-label="상태 필터">
          {FILTERS.map((x) => (
            <Link key={x.key} href={x.key ? `/admin/campaigns?s=${x.key}` : '/admin/campaigns'} className={s === x.key ? 'on' : ''}>
              {x.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="card p0">
        {list.length === 0 ? (
          <Empty icon="📄" title="캠페인이 없어요" />
        ) : (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr><th>캠페인</th><th>브랜드</th><th>등록일</th><th>마감일</th><th>상태</th><th className="num">신청 / 선정</th><th className="num">관리</th></tr>
              </thead>
              <tbody>
                {list.map((c) => {
                  const st = campaignStatus(c);
                  const b = one(c.profiles as Brand | Brand[] | null);
                  return (
                    <tr key={c.id}>
                      <td>
                        <b>{c.title}</b>
                        <div className="small muted">{c.product} · {c.reward}</div>
                        <details className="desc">
                          <summary>내용 보기</summary>
                          <div className="pre">{c.description}{c.guide ? `\n\n[콘텐츠 가이드]\n${c.guide}` : ''}</div>
                        </details>
                      </td>
                      <td>{b ? b.company || b.name : '(탈퇴 회원)'}<div className="small muted">{b?.email}</div></td>
                      <td>{fmtDate(c.created_at)}</td>
                      <td>{fmtDate(c.deadline)}</td>
                      <td><span className={`badge ${st.cls || 'b-muted'}`}>{st.label}</span></td>
                      <td className="num">{total(c.id)} / {approved(c.id)}</td>
                      <td>
                        <div className="actions">
                          {c.status === 'hidden' ? (
                            <ConfirmButton action={adminSetCampaignStatus} fields={{ id: c.id, status: 'open' }}
                              label="공개" className="btn btn-secondary btn-sm" />
                          ) : (
                            <ConfirmButton action={adminSetCampaignStatus} fields={{ id: c.id, status: 'hidden' }}
                              label="숨김" className="btn btn-secondary btn-sm"
                              confirmText="이 캠페인을 숨길까요? 크리에이터에게 보이지 않고, 브랜드도 수정·선정할 수 없어요." />
                          )}
                          <ConfirmButton action={adminDeleteCampaign} fields={{ id: c.id }}
                            label="삭제" className="btn btn-danger btn-sm"
                            confirmText={`"${c.title}" 글과 신청·채팅 내역을 모두 삭제할까요? 되돌릴 수 없어요.`} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
