self.addEventListener('push', function(event) {
  console.log('Push notification received:', event);

  if (!event.data) {
    console.log('Push event has no data');
    return;
  }

  let data;
  try {
    data = event.data.json();
  } catch (e) {
    data = {
      title: 'Stone River Portal',
      body: event.data.text(),
      icon: '/icon-192x192.png',
      badge: '/badge-72x72.png'
    };
  }

  const title = data.title || 'Stone River Portal';
  const options = {
    body: data.body || 'You have a new notification',
    icon: data.icon || '/icon-192x192.png',
    badge: data.badge || '/badge-72x72.png',
    tag: data.tag || 'stone-river-notification',
    data: data.data || {},
    requireInteraction: data.requireInteraction || false,
    vibrate: data.vibrate || [200, 100, 200]
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', function(event) {
  console.log('Notification clicked:', event);
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      if (event.notification.data && event.notification.data.url) {
        const url = event.notification.data.url;

        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url.includes(url) && 'focus' in client) {
            return client.focus();
          }
        }

        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      }

      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if ('focus' in client) {
          return client.focus();
        }
      }

      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});

self.addEventListener('install', function(event) {
  console.log('Service Worker installing.');
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  console.log('Service Worker activating.');
  event.waitUntil(self.clients.claim());
});
