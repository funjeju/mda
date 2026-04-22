'use client';

import Link from 'next/link';
import { AppShell } from '../../components/layout/AppShell';

export default function AppNotFound() {
  return (
    <AppShell>
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4">
        <span className="text-6xl">🗒️</span>
        <h1 className="text-4xl font-bold" style={{ color: '#2D2A26' }}>404</h1>
        <p className="text-sm text-center" style={{ color: '#7C756B' }}>
          요청하신 페이지를 찾을 수 없습니다
        </p>
        <Link
          href="/home"
          className="mt-2 px-5 py-2.5 rounded-xl text-sm font-medium"
          style={{ background: '#D4A547', color: '#fff' }}
        >
          홈으로 돌아가기
        </Link>
      </div>
    </AppShell>
  );
}
