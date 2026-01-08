/**
 * Dayplain Service Worker
 * Handles push notifications when browser is closed
 */

// Install event - cache basic assets
self.addEventListener('install', (event) => {
    console.log('[SW] Service Worker installed');
    self.skipWaiting();
});

// Activate event - claim clients
self.addEventListener('activate', (event) => {
    console.log('[SW] Service Worker activated');
    event.waitUntil(self.clients.claim());
});

// Push event - display notification
self.addEventListener('push', (event) => {
    console.log('[SW] Push received');

    let data = {
        title: 'Dayplain',
        body: 'You have a notification',
        icon: '/favicon.ico',
        badge: '/favicon.ico'
    };

    try {
        if (event.data) {
            const payload = event.data.json();
            console.log('[SW] Push payload:', payload);
            data = { ...data, ...payload };
        }
    } catch (e) {
        console.error('[SW] Error parsing push data:', e);
    }

    console.log('[SW] Showing notification:', data.title, data.body);

    const options = {
        body: data.body,
        icon: data.icon || '/favicon.ico',
        badge: data.badge || '/favicon.ico',
        tag: data.tag || 'dayplain-notification',
        renotify: true,  // Show notification even if same tag exists
        requireInteraction: true,  // Keep notification visible until user interacts
        silent: false,
        vibrate: [200, 100, 200],  // Vibration pattern
        data: data.data || {}
    };

    const notificationPromise = self.registration.showNotification(data.title, options)
        .then(() => {
            console.log('[SW] Notification displayed successfully');
        })
        .catch((error) => {
            console.error('[SW] Failed to show notification:', error);
        });

    event.waitUntil(notificationPromise);
});

// Notification click event - open app
self.addEventListener('notificationclick', (event) => {
    console.log('[SW] Notification clicked');

    event.notification.close();

    const data = event.notification.data || {};
    let url = '/';

    // Navigate based on notification type
    if (data.type === 'habit-reminder') {
        url = '/';
    } else if (data.type === 'task-reminder') {
        url = '/tasks';
    }

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then((clientList) => {
                // Focus existing window if available
                for (const client of clientList) {
                    if (client.url.includes(self.location.origin) && 'focus' in client) {
                        client.navigate(url);
                        return client.focus();
                    }
                }
                // Open new window if no existing window
                if (clients.openWindow) {
                    return clients.openWindow(url);
                }
            })
    );
});

// Notification close event (optional logging)
self.addEventListener('notificationclose', (event) => {
    console.log('[SW] Notification closed');
});
