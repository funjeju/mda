'use client';

import { createContext, useContext, useEffect, useState } from 'react';

type DarkMode = 'light' | 'dark';
export type ColorTheme = 'warm' | 'ocean' | 'forest' | 'lavender' | 'rose' | 'slate' | 'midnight' | 'ember';

export const COLOR_THEMES: { id: ColorTheme; label: string; emoji: string; preview: string[] }[] = [
  { id: 'warm',     label: '따뜻한 베이지',  emoji: '🌾', preview: ['#FDFBF7', '#F6F1E7', '#D4A547'] },
  { id: 'ocean',    label: '오션 블루',       emoji: '🌊', preview: ['#F5FAFE', '#E8F4FD', '#2A8CC4'] },
  { id: 'forest',   label: '포레스트 그린',   emoji: '🌲', preview: ['#F5FAF5', '#E8F5EA', '#2D7A47'] },
  { id: 'lavender', label: '라벤더',          emoji: '🪻', preview: ['#F9F7FD', '#F0EBFB', '#7B61C4'] },
  { id: 'rose',     label: '로즈 핑크',       emoji: '🌸', preview: ['#FDF5F8', '#FAE9EF', '#C4617B'] },
  { id: 'slate',    label: '슬레이트',         emoji: '🪨', preview: ['#F7F9FC', '#EDF1F7', '#4A6890'] },
  { id: 'midnight', label: '미드나잇',         emoji: '🌙', preview: ['#0F1520', '#1A2232', '#4A90D9'] },
  { id: 'ember',    label: '앰버 오렌지',      emoji: '🔥', preview: ['#FDF8F4', '#FAF0E6', '#C47830'] },
];

interface ThemeCtx {
  darkMode: DarkMode;
  toggle: () => void;
  colorTheme: ColorTheme;
  setColorTheme: (t: ColorTheme) => void;
}

const ThemeContext = createContext<ThemeCtx>({
  darkMode: 'light', toggle: () => {},
  colorTheme: 'warm', setColorTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [darkMode, setDarkMode] = useState<DarkMode>('light');
  const [colorTheme, setColorThemeState] = useState<ColorTheme>('warm');

  useEffect(() => {
    const savedDark = localStorage.getItem('mda-dark') as DarkMode | null;
    const preferred = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    const initial = savedDark ?? preferred;
    setDarkMode(initial);
    document.documentElement.classList.toggle('dark', initial === 'dark');

    const savedColor = localStorage.getItem('mda-color-theme') as ColorTheme | null;
    if (savedColor) {
      setColorThemeState(savedColor);
      applyColorTheme(savedColor);
    }
  }, []);

  const toggle = () => {
    setDarkMode((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      localStorage.setItem('mda-dark', next);
      document.documentElement.classList.toggle('dark', next === 'dark');
      return next;
    });
  };

  const setColorTheme = (t: ColorTheme) => {
    setColorThemeState(t);
    localStorage.setItem('mda-color-theme', t);
    applyColorTheme(t);
  };

  return (
    <ThemeContext.Provider value={{ darkMode, toggle, colorTheme, setColorTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

function applyColorTheme(t: ColorTheme) {
  if (t === 'warm') {
    document.documentElement.removeAttribute('data-theme');
  } else {
    document.documentElement.setAttribute('data-theme', t);
  }
}

export function useTheme() {
  return useContext(ThemeContext);
}
