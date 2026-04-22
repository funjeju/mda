importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

let initialized = false;

// 메인 스레드에서 FIREBASE_CONFIG 메시지를 받아 초기화
self.addEventListener('message', (event) => {
  if (event.data?.type === 'FIREBASE_CONFIG' && !initialized) {
    firebase.initializeApp(event.data.config);
    const messaging = firebase.messaging();
    messaging.onBackgroundMessage((payload) => {
      const { title = 'MDA', body = '' } = payload.notification ?? {};
      self.registration.showNotification(title, {
        body,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
      });
    });
    initialized = true;
  }
});
