import Link from 'next/link';

export const metadata = { title: '페이지를 찾을 수 없어요' };

export default function NotFound() {
  return (
    <div className="container page-center">
      <div className="card empty">
        <div className="ico">🔎</div>
        <h1>페이지를 찾을 수 없어요</h1>
        <p>주소가 바뀌었거나 삭제된 페이지예요.</p>
        <div className="empty-actions">
          <Link href="/" className="btn btn-primary">처음으로</Link>
          <Link href="/creator/campaigns" className="btn btn-secondary">캠페인 둘러보기</Link>
        </div>
      </div>
    </div>
  );
}
