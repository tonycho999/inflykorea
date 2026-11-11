'use client';

import { useEffect, useRef } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import type { ActionResult } from '@/app/actions';

export type FormAction = (prev: ActionResult, fd: FormData) => Promise<ActionResult>;

export function SubmitButton({
  children,
  className = 'btn btn-primary',
  pendingText = '처리 중…',
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  pendingText?: string;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending} aria-busy={pending} onClick={onClick}>
      {pending ? pendingText : children}
    </button>
  );
}

export function FormMessage({ state }: { state: ActionResult }) {
  if (state.error) return <p className="form-msg err" role="alert">{state.error}</p>;
  if (state.ok && state.ok !== 'sent') return <p className="form-msg ok" role="status">{state.ok}</p>;
  return null;
}

export default function ActionForm({
  action,
  children,
  className,
  resetOnSuccess = false,
}: {
  action: FormAction;
  children: React.ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
}) {
  const [state, formAction] = useFormState(action, {} as ActionResult);
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok && resetOnSuccess) ref.current?.reset();
  }, [state, resetOnSuccess]);

  return (
    <form ref={ref} action={formAction} className={className} noValidate>
      <FormMessage state={state} />
      {children}
    </form>
  );
}
