import type { Metadata } from 'next';
import { requireRole } from '@/lib/auth';
import { adminUpdateSettings } from '@/app/actions';
import { getSettings } from '@/lib/queries';
import ActionForm, { SubmitButton } from '@/components/ActionForm';

export const runtime = 'edge';
export const metadata: Metadata = { title: '운영 설정' };

export default async function AdminSettingsPage() {
  const { supabase } = await requireRole('admin');
  const { fee, bankInfo } = await getSettings(supabase);

  return (
    <div className="container page-wrap">
      <div className="page-head">
        <div>
          <h1>운영 설정</h1>
          <p>바꾼 값은 저장하는 즉시 모든 브랜드 화면에 반영돼요.</p>
        </div>
      </div>

      <ActionForm action={adminUpdateSettings} className="card form-card">
        <div className="field">
          <label htmlFor="fee">선정 과금 단가 (원)</label>
          <input className="input" id="fee" name="fee_per_creator" type="number" min={0} step={1000} defaultValue={fee} />
          <span className="hint">
            크리에이터 1명을 선정할 때 충전금에서 빠지는 금액이에요. 이미 선정된 건에는 적용되지 않아요. 0원이면 무료예요.
          </span>
        </div>
        <div className="field">
          <label htmlFor="bank">무통장입금 계좌 안내</label>
          <textarea className="input" id="bank" name="bank_info" rows={4} maxLength={300} defaultValue={bankInfo}
            placeholder={'예)\n국민은행 000000-00-000000\n예금주 (주)inflykorea'} />
          <span className="hint">브랜드의 충전 화면에 그대로 보여요</span>
        </div>
        <div className="form-actions">
          <SubmitButton pendingText="저장 중…">저장</SubmitButton>
        </div>
      </ActionForm>
    </div>
  );
}
