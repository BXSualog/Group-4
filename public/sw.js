/* 
   SELF-DESTRUCT SERVICE WORKER
   Version: 1.0.1 (Force Update)
   This script kills all caches and then unregisters itself.
*/

self.addEventListener('install', (event) => {
    console.log('[SW] Self-destruct installing...');
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    console.log('[SW] Self-destruct activating. Purging all caches...');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    return caches.delete(cacheName);
                })
            );
        }).then(() => {
            console.log('[SW] Caches purged. Unregistering self...');
            return self.registration.unregister();
        }).then(() => {
            return self.clients.matchAll();
        }).then((clients) => {
            clients.forEach(client => {
                if (client.url && 'navigate' in client) {
                    client.navigate(client.url);
                }
            });
        })
    );
});

// No fetch handler = no interception
