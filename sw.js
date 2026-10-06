const CACHE_NAME = 'pregon-cache-v1';

// Recursos estáticos vitales que se descargarán para el modo offline
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './logo.jpg',
  './manifest.json',
  // Librerías base (se guardarán en el teléfono)
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/react/18.2.0/umd/react.production.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.2.0/umd/react-dom.production.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/babel-standalone/7.23.6/babel.min.js',
  'https://cdn.jsdelivr.net/npm/hls.js@latest'
];

// 1. INSTALACIÓN: Guardar recursos en caché
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// 2. ACTIVACIÓN: Limpiar cachés antiguos si actualizas la app
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 3. INTERCEPTOR: Leer del caché cuando no hay internet
self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  // NO guardamos en caché transmisiones en vivo, sockets o APIs dinámicas
  if (url.includes('firebaseio.com') || 
      url.includes('stream.zeno.fm') || 
      url.includes('api.zeno.fm') || 
      url.includes('open-meteo.com') ||
      url.includes('youtube.com') ||
      url.includes('espn.com')) {
    return; 
  }

  // Interceptamos peticiones estáticas (imágenes, scripts, logos de TV)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Si está en caché (Modo offline), lo devolvemos
      if (cachedResponse) {
        return cachedResponse; 
      }
      // Si no, lo buscamos en internet
      return fetch(event.request).then((networkResponse) => {
        // Guardamos los logos e imágenes nuevas automáticamente para la próxima vez
        if (event.request.method === 'GET' && networkResponse.status === 200 && url.startsWith('http')) {
           const responseClone = networkResponse.clone();
           caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
        }
        return networkResponse;
      }).catch(() => {
        // Aquí cae si el usuario no tiene internet y el archivo no estaba guardado
      });
    })
  );
});