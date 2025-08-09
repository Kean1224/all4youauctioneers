const CACHE_NAME = 'all4you-auction-v1';
const STATIC_CACHE_URLS = [
  '/',
  '/auctions',
  '/sell',
  '/login',
  '/register',
  '/manifest.json',
  // Add other static assets
];

const API_CACHE_URLS = [
  '/api/auctions',
  '/api/users/profile',
];

// Install event - cache static resources
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching static files');
        return cache.addAll(STATIC_CACHE_URLS);
      })
      .then(() => {
        console.log('Service Worker: Installation complete');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('Service Worker: Installation failed', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('Service Worker: Deleting old cache', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker: Activation complete');
        return self.clients.claim();
      })
  );
});

// Fetch event - serve cached content when offline
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle navigation requests
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful navigation responses
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => cache.put(request, responseClone));
          }
          return response;
        })
        .catch(() => {
          // Serve cached page or offline fallback
          return caches.match(request)
            .then((response) => {
              return response || caches.match('/');
            });
        })
    );
    return;
  }

  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful API responses for read operations
          if (response.status === 200 && request.method === 'GET') {
            const responseClone = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => cache.put(request, responseClone));
          }
          return response;
        })
        .catch(() => {
          // Serve cached API response if available
          if (request.method === 'GET') {
            return caches.match(request)
              .then((response) => {
                if (response) {
                  // Add offline indicator to cached response
                  const headers = new Headers(response.headers);
                  headers.set('X-Served-By', 'service-worker-cache');
                  return new Response(response.body, {
                    status: response.status,
                    statusText: response.statusText,
                    headers: headers
                  });
                }
                // Return offline response for API calls
                return new Response(
                  JSON.stringify({ 
                    error: 'Offline', 
                    message: 'This content is not available offline' 
                  }),
                  {
                    status: 503,
                    headers: { 'Content-Type': 'application/json' }
                  }
                );
              });
          }
          
          // For non-GET requests, return network error
          return new Response(
            JSON.stringify({ 
              error: 'Network Error', 
              message: 'Unable to perform this action while offline' 
            }),
            {
              status: 503,
              headers: { 'Content-Type': 'application/json' }
            }
          );
        })
    );
    return;
  }

  // Handle static assets (images, CSS, JS)
  if (request.destination === 'image' || 
      request.destination === 'style' || 
      request.destination === 'script') {
    event.respondWith(
      caches.match(request)
        .then((response) => {
          return response || fetch(request)
            .then((fetchResponse) => {
              if (fetchResponse.status === 200) {
                const responseClone = fetchResponse.clone();
                caches.open(CACHE_NAME)
                  .then((cache) => cache.put(request, responseClone));
              }
              return fetchResponse;
            });
        })
        .catch(() => {
          // Return placeholder for failed image loads
          if (request.destination === 'image') {
            return new Response(
              '<svg width="200" height="150" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#f3f4f6"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="#6b7280">Image unavailable</text></svg>',
              { headers: { 'Content-Type': 'image/svg+xml' } }
            );
          }
        })
    );
    return;
  }

  // Default: try network first, fall back to cache
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME)
            .then((cache) => cache.put(request, responseClone));
        }
        return response;
      })
      .catch(() => {
        return caches.match(request);
      })
  );
});

// Handle background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Background sync triggered', event.tag);
  
  if (event.tag === 'bid-submission') {
    event.waitUntil(processPendingBids());
  }
  
  if (event.tag === 'form-submission') {
    event.waitUntil(processPendingForms());
  }
});

// Handle push notifications
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push notification received');
  
  const options = {
    body: 'You have new auction updates!',
    icon: '/img/ChatGPT%20Image%20Jul%2028,%202025,%2011_14_52%20PM.png',
    badge: '/img/ChatGPT%20Image%20Jul%2028,%202025,%2011_14_52%20PM.png',
    vibrate: [200, 100, 200],
    tag: 'auction-update',
    requireInteraction: true,
    actions: [
      {
        action: 'view',
        title: 'View Auction',
        icon: '/icons/view-icon.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
        icon: '/icons/dismiss-icon.png'
      }
    ]
  };

  if (event.data) {
    const data = event.data.json();
    options.body = data.body || options.body;
    options.title = data.title || 'ALL4YOU Auctions';
    options.data = data;
  }

  event.waitUntil(
    self.registration.showNotification('ALL4YOU Auctions', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification clicked', event);
  
  event.notification.close();
  
  if (event.action === 'view') {
    const url = event.notification.data?.url || '/auctions';
    event.waitUntil(
      clients.openWindow(url)
    );
  }
});

// Helper functions for background sync
async function processPendingBids() {
  // Process any pending bid submissions stored in IndexedDB
  console.log('Processing pending bids...');
  // Implementation would read from IndexedDB and attempt to submit
}

async function processPendingForms() {
  // Process any pending form submissions stored in IndexedDB
  console.log('Processing pending forms...');
  // Implementation would read from IndexedDB and attempt to submit
}

// Handle app updates
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

console.log('Service Worker: Script loaded');
