import type { Metadata } from 'next';
import { requireRole } from '@/lib/auth';
import { requestCharge, requestRefund } from '@/app/actions';
import { getSettings } from '@/lib/queries';
import ActionForm, { SubmitButton } from '@/components/ActionForm';
import Empty from '@/components/Empty';
import { TX_STATUS, TX_TYPE, fmtDateTime, won } from '@/lib/utils';

export const runtime = 'edge';
export const metadata: Metadata = { title: '충전·결제' };

export default async function WalletPage() {
  const { supabase, user, profile } = await requireRole('brand');
  const { fee, bankInfo } = await getSettings(supabase);

  const { data } = await supabase
    .from('transactions')
    .select('id, type, amount, status, memo, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(100);
  const txs = data ?? [];

  const pendingCharge = txs.filter((t) => t.type === 'charge' && t.status === 'pending').reduce((s, t) => s + t.amount, 0);
  const pendingRefund = txs.filter((t) => t.type === 'refund' && t.status === 'pending').reduce((s, t) => s + t.amount, 0);

  return (
    <div className="container page-wrap">
      <div className="page-head">
        <div>
          <h1>충전·결제</h1>
          <p>크리에이터를 선정할 때마다 1명당 <b>{won(fee)}</b>이 충전금에서 차감돼요. 미선정은 무료예요.</p>
        </div>
      </div>

      <div className="wallet-grid">
        <section className="card balance-card">
          <div className="small">사용 가능 잔액</div>
          <div className="amt">{won(profile.balance)}</div>
          <div className="small" style={{ marginTop: 12, opacity: 0.9 }}>
            약 {fee > 0 ? Math.floor(profile.balance / fee) : '∞'}명 선정 가능
            {pendingCharge > 0 && <><br />입금 확인 대기 {won(pendingCharge)}</>}
            {pendingRefund > 0 && <><br />환불 처리 대기 {won(pendingRefund)}</>}
          </div>
        </section>

        <ActionForm action={requestCharge} className="card" resetOnSuccess>
          <h2 className="sec-title">충전 신청 (무통장입금)</h2>
          <div className="bank-box pre">{bankInfo || '입금 계좌가 아직 등록되지 않았어요.'}</div>
          <div className="field">
            <label htmlFor="c-amount">충전 금액 (원)</label>
            <input className="input" id="c-amount" name="amount" type="number" min={10000} step={1000} placeholder="최소 10,000원" />
          </div>
          <div className="field">
            <label htmlFor="c-depositor">입금자명</label>
            <input className="input" id="c-depositor" name="depositor" maxLength={30} defaultValue={profile.company ?? profile.name} />
            <span className="hint">통장에 찍히는 이름과 같아야 빨리 확인돼요</span>
          </div>
          <SubmitButton className="btn btn-primary btn-block" pendingText="신청 중…">충전 신청</SubmitButton>
        </ActionForm>

        <ActionForm action={requestRefund} className="card" resetOnSuccess>
          <h2 className="sec-title">환불 요청</h2>
          <div className="field">
            <label htmlFor="r-amount">환불 금액 (원)</label>
            <input className="input" id="r-amount" name="amount" type="number" min={1000} step={1000}
              placeholder={`최대 ${won(profile.balance)}`} />
          </div>
          <div className="field">
            <label htmlFor="r-reason">사유 · 환불 받을 계좌</label>
            <input className="input" id="r-reason" name="reason" maxLength={100} placeholder="예) 잔액 환불 / 국민 000-00-0000 홍길동" />
          </div>
          <SubmitButton className="btn btn-secondary btn-block" pendingText="요청 중…">환불 요청</SubmitButton>
          <p className="hint" style={{ marginTop: 12 }}>
            요청 금액은 바로 잔액에서 보류되고, 관리자가 처리하면 환불돼요. 반려되면 잔액으로 돌아와요.
          </p>
        </ActionForm>
      </div>

      <h2 className="sec-title sec-gap">거래 내역</h2>
      <div className="card p0">
        {txs.length === 0 ? (
          <Empty icon="💳" title="거래 내역이 없어요" desc="충전 후 크리에이터를 선정하면 내역이 쌓여요." />
        ) : (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead><tr><th>일시</th><th>구분</th><th>내용</th><th>상태</th><th className="num">금액</th></tr></thead>
              <tbody>
                {txs.map((t) => (
                  <tr key={t.id}>
                    <td>{fmtDateTime(t.created_at)}</td>
                    <td>{TX_TYPE[t.type]}</td>
                    <td>{t.memo}</td>
                    <td><span className={`badge ${TX_STATUS[t.status].cls}`}>{TX_STATUS[t.status].label}</span></td>
                    <td className={`num ${t.type === 'charge' ? 'plus' : ''}`}>
                      {t.type === 'charge' ? '+' : '−'}{won(t.amount)}
                    </td>
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
