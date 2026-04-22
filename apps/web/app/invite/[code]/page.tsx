'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../lib/auth/AuthContext';
import { fetchWithAuth } from '../../../lib/auth/fetchWithAuth';

const C = {
  ivory:   '#FDFBF7',
  cream:   '#F6F1E7',
  beige:   '#E9DFC9',
  ink900:  '#2D2A26',
  ink500:  '#7C756B',
  mustard: '#D4A547',
  mint:    '#8FBFA9',
  coral:   '#EB8B7C',
};

type State = 'loading' | 'ready' | 'joining' | 'success' | 'error';

export default function InvitePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const { user, loading: authLoading, signInWithGoogle } = useAuth();
  const router = useRouter();
  const [state, setState] = useState<State>('loading');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading) setState('ready');
  }, [authLoading]);

  async function handleAccept() {
    if (!user) {
      await signInWithGoogle();
      return;
    }
    setState('joining');
    try {
      const res = await fetchWithAuth('/api/invite/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          displayName: user.displayName ?? '',
          email: user.email ?? '',
        }),
      });
      const data = await res.json() as { success?: boolean; error?: string; teamId?: string };
      if (!res.ok || !data.success) {
        setError(data.error ?? '초대 수락에 실패했습니다');
        setState('error');
      } else {
        setState('success');
        setTimeout(() => router.replace('/home'), 2000);
      }
    } catch {
      setError('네트워크 오류가 발생했습니다');
      setState('error');
    }
  }

  if (authLoading || state === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: C.ivory }}>
        <div className="w-8 h-8 border-2 rounded-full animate-spin"
          style={{ borderColor: C.mustard, borderTopColor: 'transparent' }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: C.ivory }}>
      <div className="w-full max-w-sm rounded-3xl p-8 flex flex-col items-center gap-5 text-center"
        style={{ background: C.cream, border: `1px solid ${C.beige}` }}>

        {state === 'success' ? (
          <>
            <span className="text-5xl">🎉</span>
            <p className="text-xl font-bold" style={{ color: C.ink900 }}>팀 참여 완료!</p>
            <p className="text-sm" style={{ color: C.ink500 }}>잠시 후 홈으로 이동합니다…</p>
          </>
        ) : state === 'error' ? (
          <>
            <span className="text-5xl">😢</span>
            <p className="text-lg font-bold" style={{ color: C.coral }}>초대 수락 실패</p>
            <p className="text-sm" style={{ color: C.ink500 }}>{error}</p>
            <button
              onClick={() => setState('ready')}
              className="text-sm px-4 py-2 rounded-xl"
              style={{ background: C.beige, color: C.ink900 }}
            >
              다시 시도
            </button>
          </>
        ) : (
          <>
            <span className="text-5xl">🗒️</span>
            <div>
              <p className="text-xl font-bold" style={{ color: C.ink900 }}>MDA 팀 초대</p>
              <p className="text-sm mt-1" style={{ color: C.ink500 }}>
                팀에 합류하면 프로젝트·태스크를 함께 관리할 수 있어요
              </p>
            </div>

            {user ? (
              <div className="w-full rounded-2xl p-3 text-sm"
                style={{ background: C.ivory, border: `1px solid ${C.beige}` }}>
                <p style={{ color: C.ink500 }}>로그인된 계정</p>
                <p className="font-medium mt-0.5" style={{ color: C.ink900 }}>
                  {user.displayName ?? user.email}
                </p>
              </div>
            ) : (
              <p className="text-sm" style={{ color: C.ink500 }}>
                Google 계정으로 로그인 후 참여할 수 있어요
              </p>
            )}

            <button
              onClick={handleAccept}
              disabled={state === 'joining'}
              className="w-full py-3 rounded-2xl font-semibold text-sm"
              style={{ background: C.mustard, color: '#fff', opacity: state === 'joining' ? 0.7 : 1 }}
            >
              {state === 'joining' ? '참여 중…' : user ? '팀 참여하기' : 'Google로 로그인 후 참여'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
