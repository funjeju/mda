'use client';

type GISClient = {
  requestAccessToken: () => void;
};

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (resp: { access_token?: string; error?: string }) => void;
          }) => GISClient;
        };
      };
    };
  }
}

/**
 * Google Identity Services (GIS) 팝업으로 OAuth 액세스 토큰 요청
 * layout.tsx에 GIS 스크립트가 이미 로드되어 있어야 함.
 */
export function requestGoogleToken(scope: string): Promise<string> {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  if (!clientId) {
    return Promise.reject(new Error('NEXT_PUBLIC_GOOGLE_CLIENT_ID가 설정되지 않았습니다'));
  }

  return new Promise((resolve, reject) => {
    const tc = window.google?.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope,
      callback: (resp) => {
        if (resp.access_token) resolve(resp.access_token);
        else reject(new Error(resp.error ?? 'Google OAuth 실패'));
      },
    });
    if (!tc) {
      reject(new Error('Google Identity Services 스크립트가 로드되지 않았습니다'));
      return;
    }
    tc.requestAccessToken();
  });
}
