'use client';

import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { CommandPalette } from '@/components/features/search/CommandPalette';
import { useNotifications } from '@/lib/hooks/useNotifications';

// CSS variable references so AppShell respects dark mode
const C = {
  ivory:   'var(--ivory,   #FDFBF7)',
  cream:   'var(--cream,   #F6F1E7)',
  beige:   'var(--beige,   #E9DFC9)',
  ink900:  'var(--ink-900, #2D2A26)',
  ink700:  'var(--ink-700, #4A453E)',
  ink500:  'var(--ink-500, #7C756B)',
  ink300:  'var(--ink-300, #ADA598)',
  mustard: 'var(--mustard, #D4A547)',
};

const NAV_ITEMS = [
  { href: '/home',     label: '홈',       icon: '🏠' },
  { href: '/projects', label: '프로젝트', icon: '🗂️' },
  { href: '/journal',  label: '일기',     icon: '📓' },
  { href: '/calendar', label: '캘린더',   icon: '📅' },
  { href: '/contacts', label: '연락처',   icon: '👥' },
  { href: '/focus',    label: '집중',     icon: '🍅' },
  { href: '/stats',    label: '통계',     icon: '📊' },
  { href: '/search',        label: '검색',   icon: '🔍' },
  { href: '/history',       label: '기록',   icon: '📜' },
  { href: '/notifications', label: '알림',   icon: '🔔' },
  { href: '/settings',      label: '설정',   icon: '⚙️' },
];

const MOBILE_NAV = [
  { href: '/home',     label: '홈',       icon: '🏠' },
  { href: '/todo',     label: '투두',     icon: '✅' },
  { href: '/projects', label: '프로젝트', icon: '🗂️' },
  { href: '/focus',    label: '집중',     icon: '🍅' },
  { href: '/settings', label: '설정',     icon: '⚙️' },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, teamId, signOut } = useAuth();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const { unreadCount } = useNotifications(user?.uid ?? '');

  const initials = (user?.displayName ?? user?.email ?? '?').slice(0, 2).toUpperCase();

  // Cmd+K / Ctrl+K 단축키
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
      if (e.key === '?' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        setShortcutsOpen((v) => !v);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: C.ivory }}>
      {/* 헤더 */}
      <header
        className="px-6 py-3 flex items-center justify-between sticky top-0 z-20"
        style={{ background: C.cream, borderBottom: `1px solid ${C.beige}` }}
      >
        <div className="flex items-center gap-6">
          <Link href="/home" className="flex items-center gap-2">
            <span className="text-xl">🗒️</span>
            <span className="font-bold tracking-tight" style={{ fontFamily: "'SUIT', sans-serif", color: C.ink900 }}>
              MDA
            </span>
          </Link>

          {/* 데스크톱 네비 */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <Link key={item.href} href={item.href}>
                  <div className="relative flex flex-col items-center">
                    <div
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors"
                      style={{
                        background: isActive ? C.mustard + '18' : 'transparent',
                        color: isActive ? C.mustard : C.ink700,
                        fontWeight: isActive ? 600 : 400,
                      }}
                    >
                      <span>{item.icon}</span>
                      <span>{item.label}</span>
                    </div>
                    {isActive && (
                      <div
                        className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                        style={{ background: C.mustard }}
                      />
                    )}
                  </div>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {/* 검색 버튼 */}
          <button
            onClick={() => setPaletteOpen(true)}
            className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs transition-colors"
            style={{ background: C.cream, border: `1px solid ${C.beige}`, color: C.ink500 }}
          >
            <span>🔍</span>
            <span>검색</span>
            <kbd className="text-[10px] px-1 rounded" style={{ background: C.beige }}>⌘K</kbd>
          </button>
          {/* 알림 벨 */}
          <Link href="/notifications" className="relative">
            <span className="text-xl">🔔</span>
            {unreadCount > 0 && (
              <span
                className="absolute -top-1 -right-1 text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center"
                style={{ background: '#EB8B7C', color: '#fff' }}
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Link>
          <Avatar className="w-8 h-8">
            <AvatarImage src={user?.photoURL ?? undefined} />
            <AvatarFallback className="text-xs" style={{ background: C.beige, color: C.ink700 }}>
              {initials}
            </AvatarFallback>
          </Avatar>
          <Button variant="ghost" size="sm" onClick={signOut} style={{ color: C.ink500 }}>
            로그아웃
          </Button>
        </div>
      </header>

      {/* Cmd+K 커맨드 팔레트 */}
      {user && teamId && (
        <CommandPalette
          open={paletteOpen}
          onClose={() => setPaletteOpen(false)}
          teamId={teamId}
          userId={user.uid}
        />
      )}

      {/* ? 단축키 도움말 */}
      {shortcutsOpen && (
        <>
          <div className="fixed inset-0 z-50" style={{ background: 'rgba(45,42,38,0.4)' }}
            onClick={() => setShortcutsOpen(false)} />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 rounded-2xl p-6 w-80"
            style={{ background: C.ivory, border: `1px solid ${C.beige}` }}>
            <p className="text-sm font-semibold mb-4" style={{ color: C.ink900 }}>키보드 단축키</p>
            <div className="flex flex-col gap-2">
              {[
                ['⌘K', '전체 검색'],
                ['⌘Enter', 'AI 입력 제출'],
                ['?', '단축키 도움말'],
                ['Esc', '패널/오버레이 닫기'],
              ].map(([key, desc]) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: C.ink500 }}>{desc}</span>
                  <kbd className="text-xs px-2 py-0.5 rounded font-mono"
                    style={{ background: C.beige, color: C.ink900 }}>{key}</kbd>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* 컨텐츠 */}
      <main className="flex-1 pb-16 md:pb-0">{children}</main>

      {/* 모바일 하단 탭 */}
      <nav
        className="md:hidden flex items-center justify-around py-2 fixed bottom-0 left-0 right-0 z-20"
        style={{ background: C.cream, borderTop: `1px solid ${C.beige}` }}
      >
        {MOBILE_NAV.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link key={item.href} href={item.href}>
              <div
                className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl relative"
                style={{
                  color: isActive ? C.mustard : C.ink500,
                  background: isActive ? C.mustard + '18' : 'transparent',
                }}
              >
                <span className="text-xl">{item.icon}</span>
                <span className="text-xs font-medium">{item.label}</span>
              </div>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
