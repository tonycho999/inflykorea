import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { brandLabel, getPublicProfiles, one, personLabel } from '@/lib/queries';
import ChatRoom, { type ChatMessage } from '@/components/ChatRoom';

export const runtime = 'edge';
export const metadata: Metadata = { title: '채팅' };

type Camp = { id: string; title: string; brand_id: string };

export default async function ChatRoomPage({ params }: { params: { roomId: string } }) {
  const { supabase, user } = await requireUser();

  // 채팅방 ID = 선정된 신청(application) ID
  const { data: a } = await supabase
    .from('applications')
    .select('id, creator_id, status, campaigns(id, title, brand_id)')
    .eq('id', params.roomId)
    .maybeSingle();
  const c = one(a?.campaigns as Camp | Camp[] | null);
  if (!a || !c || a.status !== 'approved' || (a.creator_id !== user.id && c.brand_id !== user.id)) notFound();

  const isCreator = a.creator_id === user.id;
  const people = await getPublicProfiles(supabase, [isCreator ? c.brand_id : a.creator_id]);
  const partner = isCreator ? brandLabel(people.get(c.brand_id)) : personLabel(people.get(a.creator_id));
  const partnerInfo = people.get(a.creator_id);

  // 최근 300개 (오래된 순으로 표시)
  const { data } = await supabase
    .from('messages')
    .select('id, sender_id, body, created_at')
    .eq('application_id', a.id)
    .order('created_at', { ascending: false })
    .limit(300);
  const messages = ((data ?? []) as ChatMessage[]).reverse();

  return (
    <div className="container page-wrap">
      <Link href="/chat" className="back">← 대화 목록</Link>
      <div className="chat-head">
        <div className="avatar" aria-hidden="true">{partner.slice(0, 1)}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <b>{partner}</b>
          <div className="small muted">
            {c.title}
            {!isCreator && partnerInfo?.channel_url && (
              <> · <a href={partnerInfo.channel_url} target="_blank" rel="noopener noreferrer nofollow" className="link">
                {partnerInfo.channel_type} 채널
              </a></>
            )}
          </div>
        </div>
        <Link
          href={isCreator ? `/creator/campaigns/${c.id}` : `/brand/campaigns/${c.id}/applicants`}
          className="btn btn-secondary btn-sm"
        >
          캠페인 보기
        </Link>
      </div>

      <ChatRoom applicationId={a.id} meId={user.id} initialMessages={messages} isCreator={isCreator} />
    </div>
  );
}
