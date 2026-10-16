// Loaded into the generated service worker via workbox `importScripts`.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const id = event.notification.data && event.notification.data.id;
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const client = windows[0];
      if (client) {
        await client.focus();
        if (id) client.postMessage({ type: 'open-reminder', id });
      } else {
        await self.clients.openWindow(id ? `./?open=${encodeURIComponent(id)}` : './');
      }
    })(),
  );
});
