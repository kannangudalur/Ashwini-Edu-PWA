/* ASHWINI Video PWA – v15 (shell + videos all pre-cached)
   NOTE: Change the version number (e.g., v15) each time you update videos or code
   so users always get the latest files and not outdated cached ones.
*/
const CACHE_NAME = 'ashwini-cache-v15'; // This name must change when you update files.

const PRECACHE_URLS = [
  /* — Main App Shell Files — */
  '/',                  // Root path
  'index.html',         // Home page
  'video.html',         // Video screen
  'offline.html',       // Page shown when offline and not cached
  'css/style.css',
  'css/video.css',
  'js/script.js',
  'images/LOGO.png',

  /* — Videos to be stored in advance (pre-cached) — */
  'videos/GestationalDiabetes.mp4',
  'videos/PreEclampsia.mp4',
  'videos/WarningsignsinNewbornsForMothersandCareTamil.mp4',
  'videos/TuberculosisSymptomsandcauses.mp4',
  'videos/handwashing.mp4',
  'videos/HowToCheckBP.mp4'
];

/* On Service Worker Installation:
   Pre-cache all files listed above so they can load even when offline.
*/
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS))  // Save all URLs to cache
      .then(() => self.skipWaiting())              // Activate new worker immediately
  );
});

/* On Activation:
   Delete old versions of the cache so only the current one is used.
*/
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)) // Remove old caches
      )
    ).then(() => self.clients.claim())  // Take control of pages immediately
  );
});

/* On Fetch (every request):
   Decide how to respond – from cache, from network, or special logic for videos.
*/
self.addEventListener('fetch', event => {
  const { request } = event;

  /* Special handling for video byte-range requests (used by video players):
     Serve video chunks from cache if available, enabling smooth streaming.
  */
  if (
    request.method === 'GET' &&
    request.url.startsWith(self.location.origin) &&
    request.url.includes('/videos/') &&
    request.headers.has('range') // e.g., "Range: bytes=0-"
  ) {
    event.respondWith(handleRangeRequest(request));
    return;
  }

  /* For page navigation (when user opens or refreshes a page) */
  if (request.mode === 'navigate') {
    const url = new URL(request.url);

    // Always serve 'video.html' from cache regardless of folder path
    if (url.pathname.endsWith('video.html')) {
      event.respondWith(
        caches.match('video.html')
          .then(r => r || fetch(request))           // Fallback to network if not in cache
          .catch(() => caches.match('offline.html')) // Offline fallback
      );
      return;
    }

    // Serve index.html for root path ("/" or "/index.html")
    event.respondWith(
      caches.match(request)
        .then(r => r || caches.match('index.html'))
        .then(r => r || fetch(request))
        .catch(() => caches.match('offline.html'))
    );
    return;
  }

  /* For all other static files (images, CSS, JS, etc.)
     Try to serve from cache first, else go to network and cache it for next time.
  */
  if (request.method === 'GET' && request.url.startsWith(self.location.origin)) {
    event.respondWith(
      caches.match(request).then(cached => {
        return cached || fetch(request).then(resp => {
          if (resp.ok) {
            caches.open(CACHE_NAME).then(c => c.put(request, resp.clone()));
          }
          return resp;
        });
      })
    );
  }
});

/* Handle video byte-range requests from cache.
   This allows video players to request only parts of the video they need
   (e.g., for streaming) without downloading the entire file.
*/
async function handleRangeRequest(request) {
  const rangeHeader = request.headers.get('range');           // e.g., "bytes=0-"
  const match = /bytes=(\d+)-(\d+)?/.exec(rangeHeader);       // Extract start and end bytes
  if (!match) return caches.match('offline.html');

  const start = Number(match[1]);
  const end   = match[2] ? Number(match[2]) : undefined;

  const cachedResponse = await caches.match(request.url);     // Get full video from cache
  if (!cachedResponse) return caches.match('offline.html');

  const buffer = await cachedResponse.arrayBuffer();          // Get full file as binary data
  const total  = buffer.byteLength;
  const chunk  = buffer.slice(start, end ? end + 1 : total);  // Slice the required range
  const chunkLen = chunk.byteLength;

  return new Response(chunk, {
    status: 206, // HTTP status for partial content
    statusText: 'Partial Content',
    headers: {
      'Content-Type': cachedResponse.headers.get('Content-Type') || 'video/mp4',
      'Content-Length': chunkLen,
      'Content-Range': `bytes ${start}-${start + chunkLen - 1}/${total}`,
      'Accept-Ranges': 'bytes'
    }
  });
}
