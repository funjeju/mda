'use client';

import { createContext, useContext, useEffect, useState } from 'react';

export type ThemeId = 'warm' | 'ocean' | 'forest' | 'lavender' | 'rose' | 'slate' | 'midnight' | 'ember';

export const THEMES: { id: ThemeId; label: string; emoji: string; preview: string[] }[] = [
  { id: 'warm',     label: '따뜻한 베이지',  emoji: '🌾', preview: ['#FDFBF7', '#F6F1E7', '#D4A547'] },
  { id: 'ocean',    label: '오션 블루',       emoji: '🌊', preview: ['#F5FAFE', '#E8F4FD', '#2A8CC4'] },
  { id: 'forest',   label: '포레스트 그린',   emoji: '🌲', preview: ['#F5FAF5', '#E8F5EA', '#2D7A47'] },
  { id: 'lavender', label: '라벤더',          emoji: '🪻', preview: ['#F9F7FD', '#F0EBFB', '#7B61C4'] },
  { id: 'rose',     label: '로즈 핑크',       emoji: '🌸', preview: ['#FDF5F8', '#FAE9EF', '#C4617B'] },
  { id: 'slate',    label: '슬레이트',         emoji: '🪨', preview: ['#F7F9FC', '#EDF1F7', '#4A6890'] },
  { id: 'midnight', label: '미드나잇',         emoji: '🌙', preview: ['#0F1520', '#1A2232', '#4A90D9'] },
  { id: 'ember',    label: '앰버 오렌지',      emoji: '🔥', preview: ['#FDF8F4', '#FAF0E6', '#C47830'] },
];

interface ThemeContextValue {
  theme: ThemeId;
  setTheme: (theme: ThemeId) => void;
}

const ThemeContext = createContext<ThemeContextValue>({ theme: 'warm', setTheme: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>('warm');

  useEffect(() => {
    const saved = localStorage.getItem('mda-theme') as ThemeId | null;
    if (saved) {
      setThemeState(saved);
      applyTheme(saved);
    }
  }, []);

  function setTheme(t: ThemeId) {
    setThemeState(t);
    localStorage.setItem('mda-theme', t);
    applyTheme(t);
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

function applyTheme(t: ThemeId) {
  if (t === 'warm') {
    document.documentElement.removeAttribute('data-theme');
  } else {
    document.documentElement.setAttribute('data-theme', t);
  }
}

export function useTheme() {
  return useContext(ThemeContext);
}
