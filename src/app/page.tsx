import Link from 'next/link';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://inflykorea.com').replace(/\/$/, '');

const features = [
  { ico: '📣', title: '캠페인 등록 · 신청자 관리', desc: '모집 글 작성부터 크리에이터 검토·선정까지 한 곳에서 처리하세요.' },
  { ico: '💬', title: '선정 크리에이터와 1:1 채팅', desc: '진행 일정과 가이드를 바로 조율하고, 새 메시지는 카카오톡으로 알려드려요.' },
  { ico: '💳', title: '선정할 때만 과금', desc: '충전금에서 크리에이터를 선정할 때만 차감돼요. 남은 잔액은 환불할 수 있어요.' },
];

const brandSteps = [
  ['캠페인 작성', '제품, 제공 내역, 모집 채널과 인원을 입력해요'],
  ['신청자 검토', '채널과 신청 메시지를 보고 크리에이터를 골라요'],
  ['선정 · 결제', '선정한 인원만큼 충전금에서 차감돼요'],
  ['채팅으로 진행', '선정 크리에이터와 바로 일정을 조율해요'],
];

const creatorSteps = [
  ['채널 등록', '블로그, 인스타그램, 유튜브, 틱톡 채널을 등록해요'],
  ['캠페인 신청', '마음에 드는 캠페인에 콘텐츠 계획을 보내요'],
  ['선정 알림', '선정되면 브랜드와 채팅방이 열려요'],
  ['콘텐츠 게시', '가이드에 맞춰 게시하고 혜택을 받아요'],
];

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'inflykorea',
  url: SITE_URL,
  inLanguage: 'ko-KR',
  description: '브랜드와 크리에이터를 연결하는 캠페인 제휴 플랫폼',
};

export default function HomePage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <section className="hero">
        <div className="container">
          <span className="badge">캠페인 제휴 플랫폼</span>
          <h1>
            브랜드와 크리에이터를
            <br />
            <em>가장 빠르게</em> 연결합니다
          </h1>
          <p>
            브랜드는 캠페인을 올리고 원하는 크리에이터를 선정하세요.
            <br className="br-pc" />
            블로거·인플루언서·유튜버는 캠페인에 신청하고 수익을 만드세요.
          </p>
          <div className="cta">
            <Link href="/signup?role=brand" className="btn btn-primary btn-lg">브랜드로 시작하기</Link>
            <Link href="/signup?role=creator" className="btn btn-secondary btn-lg">크리에이터로 시작하기</Link>
          </div>
          <p className="hint">한 계정으로 브랜드·크리에이터를 모두 이용할 수 있어요</p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <h2>inflykorea가 하는 일</h2>
          <p className="sub">캠페인 등록부터 선정, 소통까지 한 번에</p>
          <div className="grid3">
            {features.map((f) => (
              <article key={f.title} className="card">
                <div className="ico" aria-hidden="true">{f.ico}</div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section section-soft">
        <div className="container">
          <h2>이용 방법</h2>
          <p className="sub">브랜드와 크리에이터, 각자의 흐름으로 간단하게</p>
          <div className="flows">
            <div className="card">
              <span className="badge">브랜드</span>
              <ol className="steps">
                {brandSteps.map(([t, d]) => (
                  <li key={t}><div><b>{t}</b><span>{d}</span></div></li>
                ))}
              </ol>
            </div>
            <div className="card">
              <span className="badge badge-accent">크리에이터</span>
              <ol className="steps">
                {creatorSteps.map(([t, d]) => (
                  <li key={t}><div><b>{t}</b><span>{d}</span></div></li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="cta-band">
            <h2>지금 첫 캠페인을 시작해 보세요</h2>
            <p>네이버 · 카카오 · 구글 계정으로 1분이면 가입할 수 있어요</p>
            <div className="cta">
              <Link href="/signup" className="btn btn-white btn-lg">무료로 가입하기</Link>
              <Link href="/login" className="btn btn-outline-white btn-lg">로그인</Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
