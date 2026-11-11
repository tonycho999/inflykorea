import type { Metadata } from 'next';
import Link from 'next/link';
import { requireRole } from '@/lib/auth';
import { fmtDate, todayKST, won } from '@/lib/utils';

export const runtime = 'edge';
export const metadata: Metadata = { title: '관리자 대시보드' };

export default async function AdminDashboard() {
  const { supabase } = await requireRole('admin');
  const head = { count: 'exact' as const, head: true };
  const cnt = async (q: PromiseLike<{ count: number | null }>) => (await q).count ?? 0;

  const [users, brands, creators, suspended, openCamps, approvedApps, pendingCharge, pendingRefund] = await Promise.all([
    cnt(supabase.from('profiles').select('id', head)),
    cnt(supabase.from('profiles').select('id', head).eq('is_brand', true)),
    cnt(supabase.from('profiles').select('id', head).eq('is_creator', true)),
    cnt(supabase.from('profiles').select('id', head).eq('status', 'suspended')),
    cnt(supabase.from('campaigns').select('id', head).eq('status', 'open')),
    cnt(supabase.from('applications').select('id', head).eq('status', 'approved')),
    cnt(supabase.from('transactions').select('id', head).eq('type', 'charge').eq('status', 'pending')),
    cnt(supabase.from('transactions').select('id', head).eq('type', 'refund').eq('status', 'pending')),
  ]);

  // 이번 달(KST) 완료된 거래 합계
  const monthStart = `${todayKST().slice(0, 7)}-01T00:00:00+09:00`;
  const { data: txs } = await supabase
    .from('transactions')
    .select('type, amount')
    .eq('status', 'done')
    .gte('processed_at', monthStart);
  const sum = (t: string) => (txs ?? []).filter((x) => x.type === t).reduce((s, x) => s + x.amount, 0);

  const { data: recent } = await supabase
    .from('profiles')
    .select('id, name, email, is_brand, is_creator, created_at')
    .order('created_at', { ascending: false })
    .limit(5);

  return (
    <div className="container page-wrap">
      <div className="page-head">
        <div>
          <h1>대시보드</h1>
          <p>inflykorea 운영 현황이에요.</p>
        </div>
      </div>

      {(pendingCharge > 0 || pendingRefund > 0) && (
        <p className="form-msg notice" role="status">
          처리할 요청이 있어요. 입금 확인 {pendingCharge}건 · 환불 {pendingRefund}건 →{' '}
          <Link href="/admin/billing" className="link"><b>충전·환불 관리</b></Link>
        </p>
      )}

      <div className="stats">
        <div className="stat"><span>전체 회원</span><b>{users.toLocaleString()}</b></div>
        <div className="stat"><span>브랜드</span><b>{brands.toLocaleString()}</b></div>
        <div className="stat"><span>크리에이터</span><b>{creators.toLocaleString()}</b></div>
        <div className="stat"><span>정지 회원</span><b>{suspended.toLocaleString()}</b></div>
        <div className="stat"><span>모집중 캠페인</span><b>{openCamps.toLocaleString()}</b></div>
        <div className="stat"><span>누적 선정</span><b>{approvedApps.toLocaleString()}</b></div>
        <div className={`stat ${pendingCharge ? 'warn' : ''}`}><span>입금 확인 대기</span><b>{pendingCharge}건</b></div>
        <div className={`stat ${pendingRefund ? 'warn' : ''}`}><span>환불 대기</span><b>{pendingRefund}건</b></div>
      </div>

      <h2 className="sec-title">이번 달 정산 ({todayKST().slice(0, 7)})</h2>
      <div className="stats">
        <div className="stat"><span>충전 입금</span><b>{won(sum('charge'))}</b></div>
        <div className="stat"><span>선정 과금 (매출)</span><b>{won(sum('fee'))}</b></div>
        <div className="stat"><span>환불 완료</span><b>{won(sum('refund'))}</b></div>
      </div>

      <h2 className="sec-title">최근 가입</h2>
      <div className="card p0">
        <div className="tbl-wrap">
          <table className="tbl">
            <thead><tr><th>이름</th><th>이메일</th><th>유형</th><th>가입일</th></tr></thead>
            <tbody>
              {(recent ?? []).map((u) => (
                <tr key={u.id}>
                  <td><b>{u.name || '—'}</b></td>
                  <td>{u.email}</td>
                  <td>
                    {u.is_brand && <span className="badge">브랜드</span>}{' '}
                    {u.is_creator && <span className="badge badge-accent">크리에이터</span>}
                    {!u.is_brand && !u.is_creator && <span className="badge b-muted">미선택</span>}
                  </td>
                  <td>{fmtDate(u.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
