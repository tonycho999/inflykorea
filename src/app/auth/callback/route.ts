import { NextResponse, type NextRequest } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { hasEnv } from '@/lib/utils';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get('code');                  // OAuth / PKCE 이메일 인증
  const tokenHash = searchParams.get('token_hash');       // 이메일 템플릿 방식 인증
  const type = searchParams.get('type') as EmailOtpType | null;
  const rawNext = searchParams.get('next');
  const next = rawNext && rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : null;

  const go = (path: string) => NextResponse.redirect(new URL(path, origin));

  if (!hasEnv() || searchParams.get('error')) return go('/login?error=auth');

  const supabase = createClient();

  let ok = false;
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    ok = !error;
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    ok = !error;
  }
  if (!ok) return go('/login?error=auth');

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return go('/login?error=auth');

  // profiles 행은 DB 트리거(handle_new_user)가 가입 순간 자동 생성
  const { data: p } = await supabase
    .from('profiles')
    .select('is_brand, is_creator, status')
    .eq('id', user.id)
    .single();

  if (!p) return go('/login?error=auth');

  if (p.status === 'suspended') {
    await supabase.auth.signOut();
    return go('/login?error=suspended');
  }

  // 소셜 첫 로그인 → 역할 미선택 → 가입 마무리
  if (!p.is_brand && !p.is_creator) return go('/start');

  return go(next ?? (p.is_brand ? '/brand/campaigns' : '/creator/campaigns'));
}
