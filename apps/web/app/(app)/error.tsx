'use client';

import { useEffect } from 'react';

const C = {
  ivory:   '#FDFBF7',
  cream:   '#F6F1E7',
  beige:   '#E9DFC9',
  ink900:  '#2D2A26',
  ink500:  '#7C756B',
  mustard: '#D4A547',
  coral:   '#EB8B7C',
};

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[MDA Error]', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4"
      style={{ background: C.ivory }}>
      <div className="max-w-md w-full rounded-2xl p-8 flex flex-col items-center gap-4 text-center"
        style={{ background: C.cream, border: `1px solid ${C.beige}` }}>
        <span className="text-5xl">😵</span>
        <h2 className="text-lg font-semibold" style={{ color: C.ink900 }}>
          오류가 발생했습니다
        </h2>
        <p className="text-sm" style={{ color: C.ink500 }}>
          {error.message || '알 수 없는 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'}
        </p>
        {error.digest && (
          <p className="text-xs font-mono px-2 py-1 rounded"
            style={{ background: C.beige, color: C.ink500 }}>
            {error.digest}
          </p>
        )}
        <div className="flex gap-3 mt-2">
          <button
            onClick={reset}
            className="px-4 py-2 rounded-xl text-sm font-medium"
            style={{ background: C.mustard, color: '#fff' }}
          >
            다시 시도
          </button>
          <button
            onClick={() => window.location.href = '/home'}
            className="px-4 py-2 rounded-xl text-sm font-medium"
            style={{ background: C.beige, color: C.ink500 }}
          >
            홈으로
          </button>
        </div>
      </div>
    </div>
  );
}
