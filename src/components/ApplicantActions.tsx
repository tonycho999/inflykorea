'use client';

import Link from 'next/link';
import ConfirmButton from './ConfirmButton';
import { approveApplication, rejectApplication } from '@/app/actions';
import { won } from '@/lib/utils';

export default function ApplicantActions({
  applicationId,
  status,
  creatorName,
  fee,
  balance,
  full,
}: {
  applicationId: string;
  status: 'pending' | 'approved' | 'rejected';
  creatorName: string;
  fee: number;
  balance: number;
  full: boolean;
}) {
  if (status === 'approved') {
    return <Link href={`/chat/${applicationId}`} className="btn btn-secondary btn-sm">💬 채팅</Link>;
  }
  if (status === 'rejected') return null;

  const fields = { application_id: applicationId };

  return (
    <div className="actions">
      {full ? (
        <span className="badge">모집 완료</span>
      ) : balance < fee ? (
        <Link href="/brand/wallet" className="btn btn-primary btn-sm">충전 후 선정 ({won(fee)})</Link>
      ) : (
        <ConfirmButton
          action={approveApplication}
          fields={fields}
          label={`선정 (${won(fee)})`}
          className="btn btn-ok btn-sm"
          confirmText={`${creatorName} 님을 선정할까요?\n충전금에서 ${won(fee)}이 차감되고 채팅방이 열립니다.`}
        />
      )}
      <ConfirmButton
        action={rejectApplication}
        fields={fields}
        label="미선정"
        className="btn btn-danger btn-sm"
        confirmText={`${creatorName} 님을 미선정 처리할까요? (과금 없음)`}
      />
    </div>
  );
}
