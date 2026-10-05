// Background Web Push Notification handler
self.addEventListener('push', function (event) {
  let title = 'Pesan Baru';
  let body = 'Kamu menerima pesan baru';

  if (event.data) {
    try {
      const data = event.data.json();
      if (data.sender) {
        title = data.sender;
        body = 'Mengirim kamu pesan.';
      } else if (data.body) {
        body = data.body;
      }
    } catch (e) {
      body = event.data.text() || body;
    }
  }

  const options = {
    body: body,
    icon: './pwa-192x192.png',
    badge: './icon.svg',
    vibrate: [200, 100, 200],
    tag: 'soe-haru-chat-msg',
    renotify: true,
    data: {
      url: './'
    }
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      for (let i = 0; i < clientList.length; i++) {
        let client = clientList[i];
        if (client.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('./');
      }
    })
  );
});
