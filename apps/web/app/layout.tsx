import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '../lib/auth/AuthContext';
import { ThemeProvider } from '../lib/theme/ThemeProvider';
import { Toaster } from '@/components/ui/sonner';

export const metadata: Metadata = {
  title: 'MDA — My Daily Agent',
  description: '나의 하루를 스마트하고 편리하게',
  manifest: '/manifest.json',
  themeColor: '#D4A547',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'MDA',
  },
  openGraph: {
    title: 'MDA — My Daily Agent',
    description: '할 일·일정·감정을 자유롭게 입력하면 AI가 자동으로 분류합니다',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/suit-variable-fonts@1.0.0/SUIT-Variable.css"
        />
        {/* Google Identity Services — Google Calendar OAuth */}
        <script src="https://accounts.google.com/gsi/client" async defer />
        {/* PWA Service Worker 등록 */}
        <script dangerouslySetInnerHTML={{ __html: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
              navigator.serviceWorker.register('/sw.js').catch(() => {});
            });
          }
        `}} />
      </head>
      <body>
        <ThemeProvider>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
