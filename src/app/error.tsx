'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="container page-center">
      <div className="card empty">
        <div className="ico">⚠️</div>
        <h1>문제가 발생했어요</h1>
        <p>일시적인 오류일 수 있어요. 잠시 후 다시 시도해 주세요.</p>
        {error.digest && <p className="small muted">오류 코드: {error.digest}</p>}
        <div className="empty-actions">
          <button type="button" className="btn btn-primary" onClick={() => reset()}>
            다시 시도
          </button>
          <Link href="/" className="btn btn-secondary">처음으로</Link>
        </div>
      </div>
    </div>
  );
}
