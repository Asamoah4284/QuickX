/* eslint-disable no-restricted-globals */
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching';
import { clientsClaim } from 'workbox-core';
import { NavigationRoute, registerRoute } from 'workbox-routing';

self.skipWaiting();
clientsClaim();
cleanupOutdatedCaches();

const manifest = self.__WB_MANIFEST || [];
precacheAndRoute(manifest);

// Only wire SPA navigation fallback when index.html was actually precached
const hasIndexHtml = manifest.some((entry) => {
  const url = typeof entry === 'string' ? entry : entry?.url;
  return url === '/index.html' || url === 'index.html';
});

if (hasIndexHtml) {
  registerRoute(
    new NavigationRoute(createHandlerBoundToURL('/index.html'), {
      denylist: [/^\/api\//],
    })
  );
}

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: 'Quick-X', body: event.data?.text() || 'You have a new notification' };
  }

  const title = data.title || 'Quick-X';
  const options = {
    body: data.body || '',
    icon: '/pwa-192.png',
    badge: '/pwa-192.png',
    data: {
      url: data.url || '/',
      notificationId: data.notificationId || null,
      tutorId: data.tutorId || null,
    },
    tag: data.tag || (data.notificationId ? `qx-${data.notificationId}` : 'quickx'),
    renotify: Boolean(data.renotify),
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  let url = data.url || '/';
  if (!data.url && data.tutorId) {
    url = `/instructors/${data.tutorId}/community`;
  }
  const targetUrl = new URL(url, self.location.origin).href;

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of allClients) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          await client.focus();
          if ('navigate' in client) {
            await client.navigate(targetUrl);
          }
          return;
        }
      }
      if (self.clients.openWindow) {
        await self.clients.openWindow(targetUrl);
      }
    })()
  );
});
