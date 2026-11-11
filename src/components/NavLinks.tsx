'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

type Mode = 'brand' | 'creator' | 'admin';
type Roles = { isBrand: boolean; isCreator: boolean; isAdmin: boolean };

const MENUS: Record<Mode, { href: string; label: string }[]> = {
  brand: [
    { href: '/brand/campaigns', label: '내 캠페인' },
    { href: '/brand/wallet', label: '충전·결제' },
    { href: '/chat', label: '채팅' },
  ],
  creator: [
    { href: '/creator/campaigns', label: '캠페인 찾기' },
    { href: '/creator/applications', label: '내 신청' },
    { href: '/chat', label: '채팅' },
  ],
  admin: [
    { href: '/admin', label: '대시보드' },
    { href: '/admin/users', label: '회원 관리' },
    { href: '/admin/campaigns', label: '캠페인 글' },
    { href: '/admin/billing', label: '충전·환불' },
    { href: '/admin/settings', label: '설정' },
  ],
};
const HOME = { brand: '/brand/campaigns', creator: '/creator/campaigns' };
const KEY = 'infly-mode';

/** 현재 경로로 모드 판단. /chat, /mypage처럼 공용 화면에서는 마지막으로 쓴 모드 유지 */
function useMode({ isBrand, isCreator, isAdmin }: Roles): Mode {
  const path = usePathname() ?? '/';
  const fromPath: Mode | null = path.startsWith('/admin')
    ? 'admin'
    : path.startsWith('/brand')
      ? 'brand'
      : path.startsWith('/creator')
        ? 'creator'
        : null;
  const [saved, setSaved] = useState<'brand' | 'creator' | null>(null);

  useEffect(() => {
    if (fromPath === 'brand' || fromPath === 'creator') localStorage.setItem(KEY, fromPath);
    else {
      const s = localStorage.getItem(KEY);
      if (s === 'brand' || s === 'creator') setSaved(s);
    }
  }, [fromPath]);

  if (fromPath === 'admin' && isAdmin) return 'admin';
  let m: 'brand' | 'creator' =
    (fromPath === 'brand' || fromPath === 'creator' ? fromPath : saved) ?? (isBrand ? 'brand' : 'creator');
  if (m === 'brand' && !isBrand) m = 'creator';
  if (m === 'creator' && !isCreator) m = 'brand';
  return m;
}

export function NavLinks(props: Roles) {
  const mode = useMode(props);
  const path = usePathname() ?? '/';
  const isOn = (href: string) =>
    href === '/admin' ? path === '/admin' : path === href || path.startsWith(href + '/');

  return (
    <nav className="nav nav-app" aria-label="주 메뉴">
      {MENUS[mode].map((m) => (
        <Link
          key={m.href}
          href={m.href}
          className={isOn(m.href) ? 'on' : ''}
          aria-current={isOn(m.href) ? 'page' : undefined}
        >
          {m.label}
        </Link>
      ))}
    </nav>
  );
}

export function RoleSwitch(props: Roles) {
  const mode = useMode(props);
  const roles = [
    { key: 'brand' as const, label: '브랜드', has: props.isBrand },
    { key: 'creator' as const, label: '크리에이터', has: props.isCreator },
  ];

  return (
    <div className="seg seg-app" role="group" aria-label="화면 전환">
      {roles.map((r) =>
        r.has ? (
          <Link key={r.key} href={HOME[r.key]} className={mode === r.key ? 'on' : ''} aria-current={mode === r.key ? 'page' : undefined}>
            {r.label}
          </Link>
        ) : (
          <Link key={r.key} href={`/mypage?need=${r.key}`} className="add" title={`${r.label} 역할 추가`}>
            + {r.label}
          </Link>
        ),
      )}
      {props.isAdmin && (
        <Link href="/admin" className={mode === 'admin' ? 'on' : ''}>관리자</Link>
      )}
    </div>
  );
}
