export const CHANNELS = ['블로그', '인스타그램', '유튜브', '틱톡'];

export const hasEnv = () =>
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export const won = (n?: number | null) => `${Math.round(n ?? 0).toLocaleString('ko-KR')}원`;

export const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' });

export const fmtDateTime = (d: string) =>
  new Date(d).toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

export const todayKST = () => new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);

export function dday(deadline: string) {
  const diff = Math.round((Date.parse(deadline) - Date.parse(todayKST())) / 86400000);
  return diff < 0 ? '마감' : diff === 0 ? 'D-Day' : `D-${diff}`;
}

export function campaignStatus(c: { status: string; deadline: string }) {
  if (c.status === 'hidden') return { label: '관리자 숨김', cls: 'b-bad' };
  if (c.status === 'closed') return { label: '마감', cls: '' };
  if (dday(c.deadline) === '마감') return { label: '기간 종료', cls: '' };
  return { label: '모집중', cls: 'b-ok' };
}

export const APP_STATUS: Record<string, { label: string; cls: string }> = {
  pending: { label: '검토 대기', cls: 'b-warn' },
  approved: { label: '선정', cls: 'b-ok' },
  rejected: { label: '미선정', cls: 'b-bad' },
};

export const TX_TYPE: Record<string, string> = { charge: '충전', fee: '선정 과금', refund: '환불' };

export const TX_STATUS: Record<string, { label: string; cls: string }> = {
  pending: { label: '처리 대기', cls: 'b-warn' },
  done: { label: '완료', cls: 'b-ok' },
  rejected: { label: '반려', cls: 'b-bad' },
};
