import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import './globals.css';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://inflykorea.com').replace(/\/$/, '');

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'inflykorea — 브랜드 × 크리에이터 캠페인 제휴',
    template: '%s | inflykorea',
  },
  description:
    '브랜드는 캠페인을 등록하고 원하는 크리에이터를 선정하세요. 블로거·인플루언서·유튜버는 캠페인에 신청하고 수익을 만드세요.',
  keywords: ['캠페인 제휴', '인플루언서 마케팅', '블로그 체험단', '유튜버 광고', '브랜드 협찬', 'inflykorea'],
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    url: SITE_URL,
    siteName: 'inflykorea',
    title: 'inflykorea — 브랜드 × 크리에이터 캠페인 제휴',
    description: '브랜드와 크리에이터를 가장 빠르게 연결하는 캠페인 제휴 플랫폼',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'inflykorea' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'inflykorea — 브랜드 × 크리에이터 캠페인 제휴',
    description: '브랜드와 크리에이터를 가장 빠르게 연결하는 캠페인 제휴 플랫폼',
    images: ['/og-image.png'],
  },
  icons: { icon: '/favicon.ico' },
  // 네이버 서치어드바이저 / 구글 서치콘솔 인증값은 발급 후 입력
  verification: {
    // google: 'GOOGLE_VERIFICATION_CODE',
    // other: { 'naver-site-verification': 'NAVER_VERIFICATION_CODE' },
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#4f3df5',
};

function Header() {
  return (
    <header className="hdr">
      <div className="container hdr-in">
        <Link href="/" className="logo" aria-label="inflykorea 홈">
          <span className="logo-mark">in</span>
          inflykorea
        </Link>

        <nav className="nav" aria-label="주 메뉴">
          <Link href="/creator/campaigns">캠페인 찾기</Link>
          <Link href="/brand/campaigns/new">캠페인 등록</Link>
          <Link href="/notices">공지사항</Link>
        </nav>

        <div className="hdr-right">
          {/* 역할 전환: Supabase 연동 후 로그인 회원의 보유 역할에 따라 표시 */}
          <div className="seg" role="group" aria-label="화면 전환">
            <Link href="/brand/campaigns">브랜드</Link>
            <Link href="/creator/campaigns">크리에이터</Link>
          </div>
          <Link href="/login" className="btn btn-ghost btn-sm">로그인</Link>
          <Link href="/signup" className="btn btn-primary btn-sm">회원가입</Link>
        </div>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="foot">
      <div className="container">
        <div className="foot-links">
          <Link href="/notices">공지사항</Link>
          <Link href="/terms">이용약관</Link>
          <Link href="/privacy"><b>개인정보처리방침</b></Link>
        </div>
        {/* 사업자 정보는 전자상거래법상 표시 의무 — 실제 값으로 교체 */}
        <p className="foot-biz">
          상호: (주)inflykorea · 대표: 홍길동 · 사업자등록번호: 000-00-00000
          <br />
          통신판매업신고: 제0000-서울-0000호 · 고객센터: help@inflykorea.com
        </p>
        <p className="foot-copy">© {new Date().getFullYear()} inflykorea.com · 브랜드 × 크리에이터 캠페인 제휴 플랫폼</p>
      </div>
    </footer>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <a href="#main" className="skip">본문 바로가기</a>
        <Header />
        <main id="main">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
