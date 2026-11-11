import type { Metadata } from 'next';
import Link from 'next/link';
import { requireRole } from '@/lib/auth';
import { adminProcessTx } from '@/app/actions';
import { one } from '@/lib/queries';
import ConfirmButton from '@/components/ConfirmButton';
import Empty from '@/components/Empty';
import { TX_STATUS, TX_TYPE, fmtDateTime, won } from '@/lib/utils';

export const runtime = 'edge';
export const metadata: Metadata = { title: '충전·환불 관리' };

type Who = { name: string; company: string | null; email: string | null };
const who = (v: unknown) => {
  const p = one(v as Who | Who[] | null);
  return p ? { label: p.company || p.name, email: p.email } : { label: '(탈퇴 회원)', email: '' };
};

export default async function AdminBillingPage({ searchParams }: { searchParams: { t?: string } }) {
  const { supabase } = await requireRole('admin');
  const t = ['charge', 'fee', 'refund'].includes(searchParams.t ?? '') ? searchParams.t! : '';

  const { data: pend } = await supabase
    .from('transactions')
    .select('id, type, amount, memo, created_at, profiles(name, company, email)')
    .eq('status', 'pending')
    .order('created_at', { ascending: true });
  const charges = (pend ?? []).filter((x) => x.type === 'charge');
  const refunds = (pend ?? []).filter((x) => x.type === 'refund');

  let hq = supabase
    .from('transactions')
    .select('id, type, amount, status, memo, created_at, processed_at, profiles(name, company, email)')
    .order('created_at', { ascending: false })
    .limit(200);
  if (t) hq = hq.eq('type', t);
  const { data: history } = await hq;

  return (
    <div className="container page-wrap">
      <div className="page-head">
        <div>
          <h1>충전·환불 관리</h1>
          <p>통장 입금을 확인한 뒤 충전을 승인하고, 환불은 계좌 이체를 마친 뒤 완료 처리하세요.</p>
        </div>
      </div>

      <h2 className="sec-title">입금 확인 대기 ({charges.length})</h2>
      <div className="card p0">
        {charges.length === 0 ? (
          <Empty icon="✅" title="확인할 충전 신청이 없어요" />
        ) : (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead><tr><th>신청일</th><th>브랜드</th><th>내용</th><th className="num">금액</th><th className="num">처리</th></tr></thead>
              <tbody>
                {charges.map((x) => {
                  const w = who(x.profiles);
                  return (
                    <tr key={x.id}>
                      <td>{fmtDateTime(x.created_at)}</td>
                      <td><b>{w.label}</b><div className="small muted">{w.email}</div></td>
                      <td>{x.memo}</td>
                      <td className="num"><b>{won(x.amount)}</b></td>
                      <td>
                        <div className="actions">
                          <ConfirmButton action={adminProcessTx} fields={{ tx_id: x.id, approve: 'true' }}
                            label="입금 확인" className="btn btn-ok btn-sm"
                            confirmText={`${w.label} · ${won(x.amount)} 입금을 확인했나요? 승인하면 바로 잔액에 더해져요.`} />
                          <ConfirmButton action={adminProcessTx} fields={{ tx_id: x.id, approve: 'false' }}
                            label="반려" className="btn btn-danger btn-sm" confirmText="이 충전 신청을 반려할까요?" />
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

      <h2 className="sec-title sec-gap">환불 요청 ({refunds.length})</h2>
      <div className="card p0">
        {refunds.length === 0 ? (
          <Empty icon="✅" title="처리할 환불 요청이 없어요" />
        ) : (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead><tr><th>요청일</th><th>브랜드</th><th>사유 · 계좌</th><th className="num">금액</th><th className="num">처리</th></tr></thead>
              <tbody>
                {refunds.map((x) => {
                  const w = who(x.profiles);
                  return (
                    <tr key={x.id}>
                      <td>{fmtDateTime(x.created_at)}</td>
                      <td><b>{w.label}</b><div className="small muted">{w.email}</div></td>
                      <td>{x.memo}</td>
                      <td className="num"><b>{won(x.amount)}</b></td>
                      <td>
                        <div className="actions">
                          <ConfirmButton action={adminProcessTx} fields={{ tx_id: x.id, approve: 'true' }}
                            label="환불 완료" className="btn btn-ok btn-sm"
                            confirmText={`${won(x.amount)}을 계좌로 보냈나요? 완료 처리하면 되돌릴 수 없어요.`} />
                          <ConfirmButton action={adminProcessTx} fields={{ tx_id: x.id, approve: 'false' }}
                            label="반려" className="btn btn-danger btn-sm"
                            confirmText={`환불을 반려할까요? ${won(x.amount)}이 브랜드 잔액으로 돌아가요.`} />
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

      <div className="page-head sec-gap" style={{ marginBottom: 16 }}>
        <h2 className="sec-title" style={{ margin: 0 }}>전체 거래 내역 (최근 200건)</h2>
        <nav className="filters" aria-label="거래 구분">
          <Link href="/admin/billing" className={!t ? 'on' : ''}>전체</Link>
          {(['charge', 'fee', 'refund'] as const).map((k) => (
            <Link key={k} href={`/admin/billing?t=${k}`} className={t === k ? 'on' : ''}>{TX_TYPE[k]}</Link>
          ))}
        </nav>
      </div>
      <div className="card p0">
        {(history ?? []).length === 0 ? (
          <Empty icon="💳" title="거래 내역이 없어요" />
        ) : (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead><tr><th>일시</th><th>브랜드</th><th>구분</th><th>내용</th><th>상태</th><th className="num">금액</th></tr></thead>
              <tbody>
                {(history ?? []).map((x) => (
                  <tr key={x.id}>
                    <td>{fmtDateTime(x.created_at)}</td>
                    <td>{who(x.profiles).label}</td>
                    <td>{TX_TYPE[x.type]}</td>
                    <td>{x.memo}</td>
                    <td><span className={`badge ${TX_STATUS[x.status].cls}`}>{TX_STATUS[x.status].label}</span></td>
                    <td className={`num ${x.type === 'charge' ? 'plus' : ''}`}>{x.type === 'charge' ? '+' : '−'}{won(x.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
