'use client';

import { useEffect, useRef, useState } from 'react';
import { useFormState } from 'react-dom';
import { createClient } from '@/lib/supabase/client';
import { sendMessage, type ActionResult } from '@/app/actions';
import { SubmitButton } from './ActionForm';
import { fmtDateTime } from '@/lib/utils';

export type ChatMessage = { id: string; sender_id: string; body: string; created_at: string };

export default function ChatRoom({
  applicationId,
  meId,
  initialMessages,
  isCreator,
}: {
  applicationId: string;
  meId: string;
  initialMessages: ChatMessage[];
  isCreator: boolean;
}) {
  const [msgs, setMsgs] = useState<ChatMessage[]>(initialMessages);
  const [state, formAction] = useFormState(sendMessage, {} as ActionResult);
  const formRef = useRef<HTMLFormElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  // 중복 제거 + 시간순 정렬
  const merge = (list: ChatMessage[]) =>
    setMsgs((prev) => {
      const map = new Map(prev.map((m) => [m.id, m]));
      list.forEach((m) => map.set(m.id, m));
      return [...map.values()].sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));
    });

  // 서버에서 새로 받은 목록 반영 (전송 후 revalidate)
  useEffect(() => {
    merge(initialMessages);
  }, [initialMessages]);

  // 실시간 수신
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`room-${applicationId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `application_id=eq.${applicationId}` },
        (payload) => merge([payload.new as ChatMessage]),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [applicationId]);

  useEffect(() => {
    if (state?.ok === 'sent') formRef.current?.reset();
  }, [state]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [msgs.length]);

  return (
    <div className="card chat">
      {isCreator && (
        <p className="chat-hint">💡 메시지를 보내면 브랜드에게 카카오톡 알림이 전송돼요 (연동 예정)</p>
      )}

      <div className="msgs" aria-live="polite">
        {msgs.length === 0 && <p className="chat-empty">첫 메시지를 보내 보세요.</p>}
        {msgs.map((m) => {
          const mine = m.sender_id === meId;
          return (
            <div key={m.id} className={`msg ${mine ? 'me' : ''}`}>
              <div className="bubble">{m.body}</div>
              <time dateTime={m.created_at}>{fmtDateTime(m.created_at)}</time>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {state?.error && <p className="form-msg err" style={{ margin: '0 12px' }} role="alert">{state?.error}</p>}

      <form ref={formRef} action={formAction} className="composer">
        <input type="hidden" name="application_id" value={applicationId} />
        <label htmlFor="chat-body" className="sr-only">메시지</label>
        <textarea
          id="chat-body"
          name="body"
          className="input"
          rows={1}
          maxLength={1000}
          placeholder="메시지 입력 (Enter 전송, Shift+Enter 줄바꿈)"
          onKeyDown={(e) => {
            // 한글 입력 중(조합 중) Enter는 무시해야 마지막 글자가 중복 전송되지 않아요
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              formRef.current?.requestSubmit();
            }
          }}
        />
        <SubmitButton pendingText="전송 중">전송</SubmitButton>
      </form>
    </div>
  );
}
