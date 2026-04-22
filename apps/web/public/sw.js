// MDA PWA Service Worker
const CACHE_NAME = 'mda-v1';
const STATIC_ASSETS = [
  '/',
  '/home',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // API 요청은 캐시 안 함
  if (url.pathname.startsWith('/api/')) return;

  // 네비게이션 요청 — Network first, fallback to cache
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() =>
        caches.match('/home').then((r) => r ?? Response.error())
      )
    );
    return;
  }

  // 정적 자산 — Cache first
  event.respondWith(
    caches.match(event.request).then((cached) =>
      cached ?? fetch(event.request).then((res) => {
        if (res.ok && event.request.method === 'GET') {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return res;
      })
    )
  );
});

// FCM 푸시 수신
self.addEventListener('push', (event) => {
  if (!event.data) return;
  const data = event.data.json();
  const title = data.notification?.title ?? 'MDA';
  const options = {
    body: data.notification?.body ?? '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: data.data ?? {},
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// 알림 클릭 — 앱 열기
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((list) => {
      for (const client of list) {
        if ('focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow('/home');
    })
  );
});
