import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import Header from '@/components/Header';
import './globals.css';

// 헤더가 로그인 쿠키를 읽기 때문에 모든 페이지가 동적 페이지가 돼요.
// Cloudflare Pages(next-on-pages)는 동적 페이지에 edge 런타임이 필요해서
// 루트에 한 번 선언해 아래 모든 페이지에 적용해요.
export const runtime = 'edge';

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

function Footer() {
  return (
    <footer className="foot">
      <div className="container">
        <div className="foot-links">
          <Link href="/terms">이용약관</Link>
          <Link href="/privacy"><b>개인정보처리방침</b></Link>
          <a href="mailto:help@inflykorea.com">고객센터</a>
        </div>
        {/* 사업자 정보는 전자상거래법상 표시 의무 — 실제 값으로 교체 */}
        <p className="foot-biz">
          상호: 【(주)inflykorea】 · 대표: 【홍길동】 · 사업자등록번호: 【000-00-00000】
          <br />
          통신판매업신고: 【제0000-서울-0000호】 · 고객센터: help@inflykorea.com
        </p>
        <p className="foot-copy">
          © {new Date().getFullYear()} inflykorea.com · 브랜드 × 크리에이터 캠페인 제휴 플랫폼
        </p>
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
