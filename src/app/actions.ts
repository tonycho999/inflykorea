'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getCurrent, requireRole, requireUser } from '@/lib/auth';
import { CHANNELS, todayKST } from '@/lib/utils';

// 'use server' 파일에서는 async 함수와 타입만 export 할 수 있어요
export type ActionResult = { error?: string; ok?: string };

const str = (fd: FormData, k: string) => String(fd.get(k) ?? '').trim();
const int = (fd: FormData, k: string) => parseInt(str(fd, k).replace(/,/g, ''), 10);
const URL_RE = /^https?:\/\/\S+\.\S+/;
const PHONE_RE = /^01[0-9]-?\d{3,4}-?\d{4}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const UUID_RE = /^[0-9a-f-]{36}$/i;

/* =========================================================
 * 공통
 * ======================================================= */
export async function signOut() {
  const { supabase } = await getCurrent();
  if (supabase) await supabase.auth.signOut();
  redirect('/login');
}

export async function updateProfile(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const { supabase, user } = await requireUser();
  const isBrand = fd.get('is_brand') === 'on';
  const isCreator = fd.get('is_creator') === 'on';
  const name = str(fd, 'name');
  const company = str(fd, 'company');
  const phone = str(fd, 'phone');
  const channelType = str(fd, 'channel_type');
  const channelUrl = str(fd, 'channel_url');

  if (!name) return { error: '이름을 입력해 주세요.' };
  if (!isBrand && !isCreator) return { error: '브랜드 또는 크리에이터 중 하나 이상 선택해 주세요.' };
  if (isBrand && !company) return { error: '회사/브랜드명을 입력해 주세요.' };
  if (isBrand && !PHONE_RE.test(phone)) return { error: '알림톡 받을 휴대폰 번호를 정확히 입력해 주세요.' };
  if (isCreator && !CHANNELS.includes(channelType)) return { error: '주 채널을 선택해 주세요.' };
  if (isCreator && !URL_RE.test(channelUrl)) return { error: '채널 주소는 https:// 로 시작해야 합니다.' };

  const { error } = await supabase
    .from('profiles')
    .update({
      name,
      is_brand: isBrand,
      is_creator: isCreator,
      company: company || null,
      phone: phone ? phone.replace(/-/g, '') : null,
      channel_type: channelType || null,
      channel_url: channelUrl || null,
    })
    .eq('id', user.id);
  if (error) return { error: `저장 실패: ${error.message}` };

  revalidatePath('/', 'layout');
  return { ok: '저장했어요. 상단의 브랜드/크리에이터 버튼으로 화면을 전환하세요.' };
}

/* =========================================================
 * 브랜드 — 캠페인
 * ======================================================= */
export async function saveCampaign(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const { supabase, user } = await requireRole('brand');
  const id = str(fd, 'id');
  const data = {
    title: str(fd, 'title'),
    product: str(fd, 'product'),
    reward: str(fd, 'reward'),
    channels: fd.getAll('channels').map(String).filter((c) => CHANNELS.includes(c)),
    slots: int(fd, 'slots'),
    deadline: str(fd, 'deadline'),
    description: str(fd, 'description'),
    guide: str(fd, 'guide') || null,
  };

  if (!data.title) return { error: '캠페인 제목을 입력해 주세요.' };
  if (data.title.length > 80) return { error: '제목은 80자 이내로 입력해 주세요.' };
  if (!data.product) return { error: '제품/서비스명을 입력해 주세요.' };
  if (!data.reward) return { error: '제공 내역을 입력해 주세요.' };
  if (!data.channels.length) return { error: '모집 채널을 하나 이상 선택해 주세요.' };
  if (!(data.slots >= 1 && data.slots <= 500)) return { error: '모집 인원은 1~500명입니다.' };
  if (!DATE_RE.test(data.deadline)) return { error: '모집 마감일을 선택해 주세요.' };
  if (!id && data.deadline < todayKST()) return { error: '마감일은 오늘 이후여야 합니다.' };
  if (!data.description) return { error: '캠페인 상세 내용을 입력해 주세요.' };
  if (data.description.length > 3000) return { error: '상세 내용은 3,000자 이내로 입력해 주세요.' };

  if (id) {
    if (!UUID_RE.test(id)) return { error: '잘못된 요청입니다.' };
    const { count } = await supabase
      .from('applications')
      .select('id', { count: 'exact', head: true })
      .eq('campaign_id', id)
      .eq('status', 'approved');
    if ((count ?? 0) > data.slots) {
      return { error: `이미 ${count}명을 선정했어요. 모집 인원을 ${count}명 이상으로 입력하세요.` };
    }
    const { data: rows, error } = await supabase
      .from('campaigns')
      .update(data)
      .eq('id', id)
      .eq('brand_id', user.id)
      .select('id');
    if (error) return { error: `저장 실패: ${error.message}` };
    if (!rows?.length) return { error: '수정할 수 없는 캠페인이에요. (관리자 숨김 상태일 수 있어요)' };
  } else {
    const { error } = await supabase.from('campaigns').insert({ ...data, brand_id: user.id, status: 'open' });
    if (error) return { error: `등록 실패: ${error.message}` };
  }

  revalidatePath('/brand/campaigns');
  revalidatePath('/creator/campaigns');
  redirect('/brand/campaigns'); // try/catch 밖에서 호출해야 함
}

export async function setCampaignStatus(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const { supabase, user } = await requireRole('brand');
  const id = str(fd, 'id');
  const status = str(fd, 'status');
  if (!UUID_RE.test(id) || !['open', 'closed'].includes(status)) return { error: '잘못된 요청입니다.' };

  const { data: rows, error } = await supabase
    .from('campaigns')
    .update({ status })
    .eq('id', id)
    .eq('brand_id', user.id)
    .neq('status', 'hidden')
    .select('id');
  if (error) return { error: error.message };
  if (!rows?.length) return { error: '변경할 수 없는 캠페인이에요.' };

  revalidatePath('/brand/campaigns');
  revalidatePath('/creator/campaigns');
  return { ok: status === 'open' ? '모집을 재개했어요.' : '모집을 마감했어요.' };
}

/* =========================================================
 * 브랜드 — 신청자 선정 (과금은 DB RPC에서 한 번에 처리)
 * ======================================================= */
export async function approveApplication(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const { supabase } = await requireRole('brand');
  const appId = str(fd, 'application_id');
  if (!UUID_RE.test(appId)) return { error: '잘못된 요청입니다.' };

  const { error } = await supabase.rpc('approve_application', { p_app: appId });
  if (error) return { error: error.message };

  revalidatePath('/brand', 'layout');
  revalidatePath('/chat', 'layout');
  return { ok: '선정했어요. 채팅방이 열렸어요.' };
}

export async function rejectApplication(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const { supabase } = await requireRole('brand');
  const appId = str(fd, 'application_id');
  if (!UUID_RE.test(appId)) return { error: '잘못된 요청입니다.' };

  const { error } = await supabase.rpc('reject_application', { p_app: appId });
  if (error) return { error: error.message };

  revalidatePath('/brand', 'layout');
  return { ok: '미선정 처리했어요. (과금 없음)' };
}

/* =========================================================
 * 브랜드 — 충전·환불
 * ======================================================= */
export async function requestCharge(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const { supabase } = await requireRole('brand');
  const amount = int(fd, 'amount');
  const depositor = str(fd, 'depositor');
  if (!(amount >= 10000 && amount <= 10000000)) return { error: '충전 금액은 1만원~1천만원이에요.' };
  if (!depositor) return { error: '입금자명을 입력해 주세요.' };

  const { error } = await supabase.rpc('request_charge', { p_amount: amount, p_depositor: depositor });
  if (error) return { error: error.message };

  revalidatePath('/brand/wallet');
  return { ok: '충전 신청을 접수했어요. 입금이 확인되면 잔액에 반영돼요.' };
}

export async function requestRefund(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const { supabase } = await requireRole('brand');
  const amount = int(fd, 'amount');
  const reason = str(fd, 'reason').slice(0, 100);
  if (!(amount >= 1000)) return { error: '환불 금액은 1,000원 이상이에요.' };

  const { error } = await supabase.rpc('request_refund', { p_amount: amount, p_reason: reason });
  if (error) return { error: error.message };

  revalidatePath('/brand/wallet');
  return { ok: '환불 요청을 접수했어요. 요청 금액은 처리될 때까지 보류돼요.' };
}

/* =========================================================
 * 크리에이터 — 캠페인 신청
 * ======================================================= */
export async function applyCampaign(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const { supabase, user } = await requireRole('creator');
  const campaignId = str(fd, 'campaign_id');
  const channelType = str(fd, 'channel_type');
  const channelUrl = str(fd, 'channel_url');
  const message = str(fd, 'message');

  if (!UUID_RE.test(campaignId)) return { error: '잘못된 요청입니다.' };
  if (!CHANNELS.includes(channelType)) return { error: '진행 채널을 선택해 주세요.' };
  if (!URL_RE.test(channelUrl)) return { error: '채널 주소는 https:// 로 시작해야 합니다.' };
  if (message.length > 1000) return { error: '신청 메시지는 1,000자 이내로 입력해 주세요.' };

  const { error } = await supabase.from('applications').insert({
    campaign_id: campaignId,
    creator_id: user.id,
    channel_type: channelType,
    channel_url: channelUrl,
    message: message || null,
  });
  if (error) {
    if (error.code === '23505') return { error: '이미 신청한 캠페인이에요.' };
    if (error.code === '42501') return { error: '모집이 마감됐거나 신청할 수 없는 캠페인이에요.' };
    return { error: `신청 실패: ${error.message}` };
  }

  revalidatePath(`/creator/campaigns/${campaignId}`);
  revalidatePath('/creator/applications');
  return { ok: '신청했어요! 선정되면 채팅방이 열려요.' };
}

/* =========================================================
 * 채팅 (전송은 서버 액션, 수신은 ChatRoom의 Realtime 구독)
 * ======================================================= */
export async function sendMessage(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const { supabase, user } = await requireUser();
  const appId = str(fd, 'application_id');
  const body = str(fd, 'body');
  if (!UUID_RE.test(appId)) return { error: '잘못된 요청입니다.' };
  if (!body) return {};
  if (body.length > 1000) return { error: '메시지는 1,000자 이내로 입력해 주세요.' };

  const { error } = await supabase.from('messages').insert({
    application_id: appId,
    sender_id: user.id,
    body,
  });
  if (error) return { error: '메시지를 보낼 수 없어요. 선정된 대화방인지 확인해 주세요.' };

  // TODO(알림톡): 크리에이터가 보낸 경우 → DB Webhook → supabase/functions/kakao-alimtalk
  revalidatePath(`/chat/${appId}`);
  return { ok: 'sent' };
}

/* =========================================================
 * 관리자
 * ======================================================= */
export async function adminProcessTx(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const { supabase } = await requireRole('admin');
  const txId = str(fd, 'tx_id');
  const approve = str(fd, 'approve') === 'true';
  if (!UUID_RE.test(txId)) return { error: '잘못된 요청입니다.' };

  const { error } = await supabase.rpc('admin_process_tx', { p_tx: txId, p_approve: approve });
  if (error) return { error: error.message };

  revalidatePath('/admin', 'layout');
  return { ok: approve ? '승인했어요.' : '반려했어요.' };
}

export async function adminSetUserStatus(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const { supabase } = await requireRole('admin');
  const userId = str(fd, 'user_id');
  const status = str(fd, 'status');
  if (!UUID_RE.test(userId) || !['active', 'suspended'].includes(status)) return { error: '잘못된 요청입니다.' };

  const { error } = await supabase.rpc('admin_set_user_status', { p_user: userId, p_status: status });
  if (error) return { error: error.message };

  revalidatePath('/admin/users');
  return { ok: status === 'active' ? '정지를 해제했어요.' : '이용을 정지했어요.' };
}

export async function adminSetCampaignStatus(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const { supabase } = await requireRole('admin');
  const id = str(fd, 'id');
  const status = str(fd, 'status');
  if (!UUID_RE.test(id) || !['open', 'closed', 'hidden'].includes(status)) return { error: '잘못된 요청입니다.' };

  const { error } = await supabase.from('campaigns').update({ status }).eq('id', id);
  if (error) return { error: error.message };

  revalidatePath('/admin/campaigns');
  revalidatePath('/creator/campaigns');
  return { ok: status === 'hidden' ? '숨김 처리했어요.' : '공개했어요.' };
}

export async function adminDeleteCampaign(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const { supabase } = await requireRole('admin');
  const id = str(fd, 'id');
  if (!UUID_RE.test(id)) return { error: '잘못된 요청입니다.' };

  const { data: rows, error } = await supabase.from('campaigns').delete().eq('id', id).select('id');
  if (error) return { error: error.message };
  if (!rows?.length) return { error: '삭제할 캠페인을 찾지 못했어요.' };

  revalidatePath('/admin/campaigns');
  revalidatePath('/creator/campaigns');
  return { ok: '삭제했어요.' };
}

export async function adminUpdateSettings(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const { supabase } = await requireRole('admin');
  const fee = int(fd, 'fee_per_creator');
  const bankInfo = str(fd, 'bank_info');
  if (!(fee >= 0 && fee <= 10000000)) return { error: '과금 단가는 0원~1천만원이에요.' };
  if (!bankInfo) return { error: '입금 계좌 정보를 입력해 주세요.' };

  const { error } = await supabase
    .from('settings')
    .update({ fee_per_creator: fee, bank_info: bankInfo })
    .eq('id', 1);
  if (error) return { error: error.message };

  revalidatePath('/', 'layout');
  return { ok: '설정을 저장했어요.' };
}
