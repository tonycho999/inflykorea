import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireRole } from '@/lib/auth';
import { getPublicProfiles, getSettings, personLabel } from '@/lib/queries';
import ApplicantActions from '@/components/ApplicantActions';
import Empty from '@/components/Empty';
import { APP_STATUS, campaignStatus, fmtDate, fmtDateTime, won } from '@/lib/utils';

export const runtime = 'edge';
export const metadata: Metadata = { title: '신청자 관리' };

const ORDER: Record<string, number> = { pending: 0, approved: 1, rejected: 2 };

export default async function ApplicantsPage({ params }: { params: { id: string } }) {
  const { supabase, user, profile } = await requireRole('brand');

  const { data: c } = await supabase
    .from('campaigns')
    .select('id, title, slots, deadline, status')
    .eq('id', params.id)
    .eq('brand_id', user.id)
    .maybeSingle();
  if (!c) notFound();

  const { data } = await supabase
    .from('applications')
    .select('id, creator_id, channel_type, channel_url, message, status, created_at')
    .eq('campaign_id', c.id)
    .order('created_at', { ascending: false });
  const apps = (data ?? []).sort((a, b) => ORDER[a.status] - ORDER[b.status]);

  const people = await getPublicProfiles(supabase, apps.map((a) => a.creator_id));
  const { fee } = await getSettings(supabase);

  const approved = apps.filter((a) => a.status === 'approved').length;
  const pending = apps.filter((a) => a.status === 'pending').length;
  const full = approved >= c.slots;
  const st = campaignStatus(c);

  return (
    <div className="container page-wrap">
      <Link href="/brand/campaigns" className="back">← 내 캠페인</Link>
      <div className="page-head">
        <div>
          <h1>{c.title}</h1>
          <p>
            <span className={`badge ${st.cls || 'b-muted'}`}>{st.label}</span>{' '}
            선정 <b>{approved}</b> / {c.slots}명 · 대기 {pending}건 · 마감 {fmtDate(c.deadline)}
          </p>
        </div>
        <div className="actions">
          <span className="small muted">잔액 <b>{won(profile.balance)}</b> · 1명당 {won(fee)}</span>
          <Link href="/brand/wallet" className="btn btn-secondary btn-sm">충전하기</Link>
        </div>
      </div>

      {c.status === 'hidden' && (
        <p className="form-msg err" role="alert">관리자가 숨김 처리한 캠페인이라 새로 선정할 수 없어요.</p>
      )}

      <div className="card p0">
        {apps.length === 0 ? (
          <Empty icon="🙋" title="아직 신청한 크리에이터가 없어요" desc="신청이 들어오면 이곳에서 확인하고 선정할 수 있어요." />
        ) : (
          apps.map((a) => {
            const p = people.get(a.creator_id);
            const name = personLabel(p);
            const s = APP_STATUS[a.status];
            return (
              <div key={a.id} className="appl">
                <div className="avatar" aria-hidden="true">{name.slice(0, 1)}</div>
                <div className="appl-body">
                  <div className="row-inline">
                    <b>{name}</b>
                    <span className="tag">{a.channel_type}</span>
                    <span className={`badge ${s.cls}`}>{s.label}</span>
                  </div>
                  <div className="small muted break">
                    <a href={a.channel_url} target="_blank" rel="noopener noreferrer nofollow" className="link">
                      {a.channel_url}
                    </a>{' '}
                    · {fmtDateTime(a.created_at)} 신청
                  </div>
                  {a.message && <p className="pre">{a.message}</p>}
                </div>
                {c.status !== 'hidden' || a.status === 'approved' ? (
                  <ApplicantActions
                    applicationId={a.id}
                    status={a.status}
                    creatorName={name}
                    fee={fee}
                    balance={profile.balance}
                    full={full}
                  />
                ) : null}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
