importScripts('https://www.gstatic.com/firebasejs/12.19.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.19.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyBnP_TuWAq0eE3hpCOdSgMv1FmzAdZhExA',
  authDomain: 'quiet-journal-journey-f3905.firebaseapp.com',
  projectId: 'quiet-journal-journey-f3905',
  storageBucket: 'quiet-journal-journey-f3905.firebasestorage.app',
  messagingSenderId: '810907134717',
  appId: '1:810907134717:web:f250e38ed9d17640cf2c94'
});

const messaging = firebase.messaging();

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

messaging.onBackgroundMessage((payload) => {
  const data = payload?.data || {};
  const title = payload?.notification?.title || data.title || 'Quiet Journal Journey reminder';
  const body = payload?.notification?.body || data.body || 'You have an important reminder waiting.';
  const dateKey = data.dateKey || '';
  const reminderType = data.reminderType || 'push';
  const time = data.time || '';
  const note = data.note || body;

  self.registration.showNotification(title, {
    body,
    tag: `important-reminder:${dateKey}:${reminderType}`,
    renotify: false,
    requireInteraction: reminderType === 'today',
    data: {
      dateKey,
      reminderType,
      note,
      time,
      tab: data.tab || 'memories'
    }
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const dateKey = event.notification.data?.dateKey || '';
  const tab = event.notification.data?.tab || 'memories';
  const targetUrl = new URL(self.registration.scope);
  if (tab) targetUrl.searchParams.set('tab', tab);
  if (dateKey) targetUrl.searchParams.set('date', dateKey);

  event.waitUntil((async () => {
    const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of clientList) {
      const clientUrl = new URL(client.url);
      if (clientUrl.origin === targetUrl.origin) {
        if ('focus' in client) {
          await client.focus();
        }
        if ('navigate' in client) {
          await client.navigate(targetUrl.toString());
        }
        return;
      }
    }
    await self.clients.openWindow(targetUrl.toString());
  })());
});
