import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'edge'; // Cloudflare Pages(next-on-pages) 필수

const home = (r: { is_brand?: boolean; is_creator?: boolean }) =>
  r.is_brand ? '/brand/campaigns' : '/creator/campaigns';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const nextRaw = searchParams.get('next');
  const next = nextRaw && nextRaw.startsWith('/') && !nextRaw.startsWith('//') ? nextRaw : null;

  const fail = (msg: string) => NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(msg)}`);

  const oauthError = searchParams.get('error_description');
  if (oauthError) return fail(oauthError);
  if (!code) return fail('인증 코드가 없습니다. 다시 시도해 주세요.');
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return fail('Supabase 설정 전입니다.');
  }

  const supabase = createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) return fail('로그인에 실패했어요. 다시 시도해 주세요.');
  const user = data.user;

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_brand, is_creator, onboarded')
    .eq('id', user.id)
    .maybeSingle();

  if (profile?.onboarded) return NextResponse.redirect(`${origin}${next ?? home(profile)}`);

  // 이메일 가입자: 가입 때 넣은 metadata로 profiles 생성
  const m = user.user_metadata ?? {};
  if (m.is_brand || m.is_creator) {
    const { error: upsertError } = await supabase.from('profiles').upsert({
      id: user.id,
      email: user.email,
      name: m.name ?? '',
      is_brand: !!m.is_brand,
      is_creator: !!m.is_creator,
      company: m.company ?? null,
      phone: m.phone ?? null,
      channel_type: m.channel_type ?? null,
      channel_url: m.channel_url ?? null,
      onboarded: true,
    });
    if (!upsertError) return NextResponse.redirect(`${origin}${next ?? home(m)}`);
  }

  // 소셜 첫 로그인 → 역할 선택
  return NextResponse.redirect(`${origin}/onboarding`);
}
