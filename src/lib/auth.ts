import { redirect } from 'next/navigation';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { createClient } from './supabase/server';
import { hasEnv } from './utils';

export type Profile = {
  id: string;
  email: string | null;
  name: string;
  is_brand: boolean;
  is_creator: boolean;
  is_admin: boolean;
  company: string | null;
  phone: string | null;
  channel_type: string | null;
  channel_url: string | null;
  balance: number;
  status: 'active' | 'suspended';
  created_at: string;
};

type Ctx = { supabase: SupabaseClient; user: User; profile: Profile };

/** 로그인 정보 조회 (로그인 안 했거나 Supabase 설정 전이면 빈 값) */
export async function getCurrent(): Promise<Partial<Ctx>> {
  if (!hasEnv()) return {};
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase };
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  return { supabase, user, profile: (profile as Profile) ?? undefined };
}

/** 로그인 필수 페이지용 */
export async function requireUser(): Promise<Ctx> {
  const ctx = await getCurrent();
  if (!ctx.supabase || !ctx.user || !ctx.profile) redirect('/login');
  if (ctx.profile.status !== 'active') redirect('/login?error=suspended');
  return ctx as Ctx;
}

/** 역할 필수 페이지용 (브랜드 / 크리에이터 / 관리자) */
export async function requireRole(role: 'brand' | 'creator' | 'admin'): Promise<Ctx> {
  const ctx = await requireUser();
  const p = ctx.profile;
  if (role === 'admin' && !p.is_admin) redirect('/');
  if (role === 'brand' && !p.is_brand) redirect('/mypage?need=brand');
  if (role === 'creator' && !p.is_creator) redirect('/mypage?need=creator');
  return ctx;
}
