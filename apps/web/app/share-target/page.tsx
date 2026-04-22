'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

// F-007: Web Share Target API
// manifest.json share_target action → 이 페이지로 GET 요청
// 공유된 텍스트/URL을 홈 화면의 SmartInput으로 전달

function ShareTargetHandler() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    const title = params.get('title') ?? '';
    const text  = params.get('text')  ?? '';
    const url   = params.get('url')   ?? '';

    const combined = [title, text, url].filter(Boolean).join(' ').trim();

    if (combined) {
      // sessionStorage를 통해 홈 페이지에 전달
      sessionStorage.setItem('share_target_text', combined);
    }

    router.replace('/home');
  }, [params, router]);

  return (
    <div className="min-h-screen flex items-center justify-center"
      style={{ background: '#FDFBF7' }}>
      <p className="text-sm" style={{ color: '#ADA598' }}>공유 내용을 불러오는 중...</p>
    </div>
  );
}

export default function ShareTargetPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#FDFBF7' }}>
        <p className="text-sm" style={{ color: '#ADA598' }}>로딩 중...</p>
      </div>
    }>
      <ShareTargetHandler />
    </Suspense>
  );
}
