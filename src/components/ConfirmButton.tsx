'use client';

import { useFormState } from 'react-dom';
import type { ActionResult } from '@/app/actions';
import { SubmitButton, type FormAction } from './ActionForm';

export default function ConfirmButton({
  action,
  fields,
  label,
  confirmText,
  className = 'btn btn-secondary btn-sm',
  pendingText = '처리 중…',
}: {
  action: FormAction;
  fields: Record<string, string>;
  label: React.ReactNode;
  confirmText?: string;
  className?: string;
  pendingText?: string;
}) {
  const [state, formAction] = useFormState(action, {} as ActionResult);

  return (
    <form action={formAction} className="inline-form">
      {Object.entries(fields).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <SubmitButton
        className={className}
        pendingText={pendingText}
        onClick={(e) => {
          // 버튼 클릭 단계에서 막아야 서버 액션이 확실히 실행되지 않아요
          if (confirmText && !window.confirm(confirmText)) e.preventDefault();
        }}
      >
        {label}
      </SubmitButton>
      {state?.error && <span className="inline-err" role="alert">{state?.error}</span>}
    </form>
  );
}
