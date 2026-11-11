import type { SupabaseClient } from '@supabase/supabase-js';

export type PubProfile = {
  id: string;
  name: string;
  company: string | null;
  channel_type: string | null;
  channel_url: string | null;
};

/** 다른 회원의 공개 정보 조회 (public_profiles 뷰) → id로 찾는 Map */
export async function getPublicProfiles(supabase: SupabaseClient, ids: (string | null | undefined)[]) {
  const uniq = Array.from(new Set(ids.filter(Boolean))) as string[];
  const map = new Map<string, PubProfile>();
  if (!uniq.length) return map;
  const { data } = await supabase
    .from('public_profiles')
    .select('id, name, company, channel_type, channel_url')
    .in('id', uniq);
  (data ?? []).forEach((p) => map.set(p.id, p as PubProfile));
  return map;
}

export const brandLabel = (p?: PubProfile | null) => (p ? p.company || p.name : '(탈퇴 회원)');
export const personLabel = (p?: PubProfile | null) => (p ? p.name || '회원' : '(탈퇴 회원)');

/** 운영 설정 (선정 과금 단가, 입금 계좌) */
export async function getSettings(supabase: SupabaseClient) {
  const { data } = await supabase.from('settings').select('fee_per_creator, bank_info').eq('id', 1).single();
  return { fee: data?.fee_per_creator ?? 10000, bankInfo: data?.bank_info ?? '' };
}

/** Supabase 관계 조회 결과가 배열 또는 객체로 올 수 있어 하나로 통일 */
export function one<T>(v: T | T[] | null | undefined): T | null {
  return Array.isArray(v) ? v[0] ?? null : v ?? null;
}
