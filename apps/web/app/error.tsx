'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[MDA Global Error]', error);
  }, [error]);

  return (
    <html lang="ko">
      <body style={{ background: '#FDFBF7', margin: 0, fontFamily: 'sans-serif' }}>
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ textAlign: 'center', maxWidth: 400 }}>
            <p style={{ fontSize: 48 }}>💥</p>
            <h2 style={{ color: '#2D2A26', marginBottom: 8 }}>치명적 오류</h2>
            <p style={{ color: '#7C756B', fontSize: 14, marginBottom: 16 }}>
              {error.message || '앱을 불러오는 데 실패했습니다.'}
            </p>
            <button
              onClick={reset}
              style={{ background: '#D4A547', color: '#fff', border: 'none', borderRadius: 12, padding: '8px 20px', cursor: 'pointer', fontSize: 14 }}
            >
              다시 시도
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
