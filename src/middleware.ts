import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

// 로그인해야 들어갈 수 있는 경로
const PROTECTED = ['/brand', '/creator', '/chat', '/mypage', '/admin', '/start'];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return response; // Supabase 연결 전에는 그냥 통과

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(list: { name: string; value: string; options?: CookieOptions }[]) {
        // 갱신된 세션 쿠키를 요청과 응답 양쪽에 반영
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // 세션 갱신 (이 호출이 있어야 로그인 상태가 유지돼요)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const needsLogin = PROTECTED.some((p) => path === p || path.startsWith(p + '/'));

  if (!user && needsLogin) {
    const to = request.nextUrl.clone();
    to.pathname = '/login';
    to.search = `?next=${encodeURIComponent(path)}`;
    return NextResponse.redirect(to);
  }

  return response;
}

export const config = {
  // 정적 파일과 이미지는 건너뛰기
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
};
