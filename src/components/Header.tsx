import Link from 'next/link';
import { getCurrent } from '@/lib/auth';
import { signOut } from '@/app/actions';
import { NavLinks, RoleSwitch } from './NavLinks';

export default async function Header() {
  const { profile } = await getCurrent();
  const me = profile && profile.status === 'active' ? profile : null;
  const needsSetup = me && !me.is_brand && !me.is_creator; // 소셜 첫 가입 후 역할 미선택

  return (
    <header className="hdr">
      <div className="container hdr-in">
<Link href="/" className="logo" aria-label="inflykorea 홈">
  <img src="/logo.png" alt="inflykorea" className="logo-img" width={200} height={48} />
</Link>

        {!me && (
          <>
            <nav className="nav" aria-label="주 메뉴">
              <Link href="/creator/campaigns">캠페인 찾기</Link>
              <Link href="/signup?role=brand">캠페인 등록</Link>
            </nav>
            <div className="hdr-right">
              <Link href="/login" className="btn btn-ghost btn-sm">로그인</Link>
              <Link href="/signup" className="btn btn-primary btn-sm">회원가입</Link>
            </div>
          </>
        )}

        {me && needsSetup && (
          <div className="hdr-right">
            <Link href="/start" className="btn btn-primary btn-sm">가입 마무리하기</Link>
            <form action={signOut}>
              <button type="submit" className="btn btn-ghost btn-sm">로그아웃</button>
            </form>
          </div>
        )}

        {me && !needsSetup && (
          <>
            <NavLinks isBrand={me.is_brand} isCreator={me.is_creator} isAdmin={me.is_admin} />
            <div className="hdr-right">
              <RoleSwitch isBrand={me.is_brand} isCreator={me.is_creator} isAdmin={me.is_admin} />
              <Link href="/mypage" className="who"><b>{me.name || '회원'}</b>님</Link>
              <form action={signOut}>
                <button type="submit" className="btn btn-ghost btn-sm">로그아웃</button>
              </form>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
