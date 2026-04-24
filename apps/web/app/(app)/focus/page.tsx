'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../lib/auth/AuthContext';
import { AppShell } from '../../../components/layout/AppShell';

const C = {
  ivory:   '#FDFBF7',
  cream:   '#F6F1E7',
  beige:   '#E9DFC9',
  ink900:  '#2D2A26',
  ink500:  '#7C756B',
  ink300:  '#ADA598',
  mustard: '#D4A547',
  mint:    '#8FBFA9',
  coral:   '#EB8B7C',
};

type Mode = 'focus' | 'short' | 'long';

const MODES: { key: Mode; label: string; minutes: number; color: string }[] = [
  { key: 'focus', label: '집중',     minutes: 25, color: C.mustard },
  { key: 'short', label: '짧은 휴식', minutes: 5,  color: C.mint },
  { key: 'long',  label: '긴 휴식',   minutes: 15, color: C.coral },
];

export default function FocusPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [user, loading, router]);

  if (loading || !user) return null;

  return (
    <AppShell>
      <FocusTimer />
    </AppShell>
  );
}

function FocusTimer() {
  const [mode, setMode] = useState<Mode>('focus');
  const [running, setRunning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [sessions, setSessions] = useState(() => {
    if (typeof window === 'undefined') return 0;
    const saved = localStorage.getItem('focus_sessions_date');
    const today = new Date().toDateString();
    if (saved !== today) { localStorage.removeItem('focus_sessions'); return 0; }
    return parseInt(localStorage.getItem('focus_sessions') ?? '0', 10);
  });
  const [task, setTask] = useState(() =>
    typeof window !== 'undefined' ? (localStorage.getItem('focus_task') ?? '') : '',
  );
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    localStorage.setItem('focus_sessions', String(sessions));
    localStorage.setItem('focus_sessions_date', new Date().toDateString());
  }, [sessions]);

  useEffect(() => {
    localStorage.setItem('focus_task', task);
  }, [task]);

  const currentMode = MODES.find((m) => m.key === mode)!;
  const totalSeconds = currentMode.minutes * 60;
  const progress = ((totalSeconds - secondsLeft) / totalSeconds) * 100;

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const timeStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const stop = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setRunning(false);
  }, []);

  const reset = useCallback((m?: Mode) => {
    stop();
    const target = m ?? mode;
    const mins = MODES.find((x) => x.key === target)!.minutes;
    setSecondsLeft(mins * 60);
  }, [mode, stop]);

  const switchMode = (m: Mode) => {
    setMode(m);
    reset(m);
  };

  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          setRunning(false);
          if (mode === 'focus') setSessions((s) => s + 1);
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(mode === 'focus' ? '🍅 집중 완료!' : '☕ 휴식 끝!', {
              body: mode === 'focus' ? '잠깐 쉬세요' : '다시 집중할 시간입니다',
            });
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, mode]);

  // SVG circle params
  const r = 90;
  const circ = 2 * Math.PI * r;
  const dashOffset = circ * (1 - progress / 100);

  return (
    <div className="max-w-sm mx-auto px-4 py-8 flex flex-col items-center gap-6">
      <h2 className="text-xl font-semibold" style={{ color: C.ink900 }}>집중 타이머 🍅</h2>

      {/* 모드 탭 */}
      <div className="flex rounded-2xl overflow-hidden" style={{ border: `1px solid ${C.beige}` }}>
        {MODES.map((m) => (
          <button
            key={m.key}
            onClick={() => switchMode(m.key)}
            className="px-4 py-2 text-xs font-medium transition-colors"
            style={{
              background: mode === m.key ? m.color : C.cream,
              color: mode === m.key ? '#fff' : C.ink500,
            }}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* 타이머 원 */}
      <div className="relative flex items-center justify-center">
        <svg width={220} height={220}>
          <circle cx={110} cy={110} r={r} fill="none"
            strokeWidth={8} stroke={C.beige} />
          <circle cx={110} cy={110} r={r} fill="none"
            strokeWidth={8} stroke={currentMode.color}
            strokeDasharray={circ}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            transform="rotate(-90 110 110)"
            style={{ transition: 'stroke-dashoffset 1s linear' }}
          />
        </svg>
        <div className="absolute flex flex-col items-center">
          <span className="text-4xl font-bold font-mono" style={{ color: C.ink900 }}>{timeStr}</span>
          <span className="text-xs mt-1" style={{ color: C.ink500 }}>{currentMode.label}</span>
        </div>
      </div>

      {/* 집중할 태스크 입력 */}
      <input
        value={task}
        onChange={(e) => setTask(e.target.value)}
        placeholder="지금 집중할 태스크 (선택)"
        className="w-full rounded-2xl px-4 py-2.5 text-sm outline-none text-center"
        style={{ background: C.cream, border: `1px solid ${C.beige}`, color: C.ink900 }}
        disabled={running}
      />

      {/* 컨트롤 버튼 */}
      <div className="flex gap-3">
        <button
          onClick={() => reset()}
          className="w-12 h-12 rounded-full flex items-center justify-center text-lg"
          style={{ background: C.cream, border: `1px solid ${C.beige}` }}
        >
          ↺
        </button>
        <button
          onClick={() => setRunning((r) => !r)}
          className="w-20 h-12 rounded-full font-semibold text-sm"
          style={{ background: currentMode.color, color: '#fff' }}
        >
          {running ? '일시정지' : secondsLeft === 0 ? '다시' : '시작'}
        </button>
        <button
          onClick={() => {
            stop();
            const nextMode: Mode = mode === 'focus'
              ? (sessions > 0 && (sessions + 1) % 4 === 0 ? 'long' : 'short')
              : 'focus';
            switchMode(nextMode);
          }}
          className="w-12 h-12 rounded-full flex items-center justify-center text-lg"
          style={{ background: C.cream, border: `1px solid ${C.beige}` }}
        >
          ⏭
        </button>
      </div>

      {/* 세션 카운트 */}
      <div className="flex flex-col items-center gap-2">
        <div className="flex gap-1.5">
          {Array.from({ length: Math.max(4, sessions) }, (_, i) => (
            <div
              key={i}
              className="w-2.5 h-2.5 rounded-full"
              style={{ background: i < sessions ? C.mustard : C.beige }}
            />
          ))}
        </div>
        <p className="text-xs" style={{ color: C.ink500 }}>
          오늘 {sessions}회 집중 완료 · 4회마다 긴 휴식
        </p>
      </div>

      {task && running && (
        <div className="rounded-2xl px-4 py-3 text-center"
          style={{ background: currentMode.color + '18', border: `1px solid ${currentMode.color}30` }}>
          <p className="text-sm font-medium" style={{ color: C.ink900 }}>🎯 {task}</p>
        </div>
      )}
    </div>
  );
}
