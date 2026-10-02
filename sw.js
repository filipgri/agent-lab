/* ============================================================================
   sw.js - the service worker: Agent Lab works with no internet
   ============================================================================
   MILESTONE 9. A service worker is a small script the browser keeps running in
   the background, separate from the page. Its job here is simple: keep a copy
   of every file the app is made of, and serve those copies instead of asking
   the network. After the very first visit the app opens with the Wi-Fi off.

   ⚠️ BUMP CACHE_VERSION ON EVERY RELEASE (spec §9)
   The browser only notices a new service worker when this FILE changes, and
   the old cache is only thrown away when the version below changes. Forget to
   bump it and iPads will keep running the old app no matter how many times
   you push. Bump the ?v= numbers in index.html at the same time.

   WHAT IS NOT CACHED, AND WHY
   Nothing a child makes. Their agents, drawings and recordings live in
   IndexedDB (spec §3), which is their own storage and nothing to do with this
   cache. Clearing the cache updates the app; it does not touch their work.
   ========================================================================== */

const CACHE_VERSION = 'agent-lab-v9';

/* Every file the app needs to start. The ?v= numbers must match the ones in
   index.html exactly - a service worker caches URLs, and ./app.js and
   ./app.js?v=9 are two different URLs as far as it is concerned. */
const APP_FILES = [
  './',
  './index.html',
  './style.css?v=9',
  './storage.js?v=9',
  './audio.js?v=9',
  './effects.js?v=9',
  './app.js?v=9',
  './manifest.json',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

/* INSTALL: fetch everything and put it in the cache.
   addAll fails the whole install if any one file 404s, which is what we want:
   a half-cached app that works offline only sometimes is worse than one that
   waits and tries again. */
self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then(function (cache) { return cache.addAll(APP_FILES); })
      // Do NOT skip waiting here. A new worker waits until the child closes
      // the app, or until they tap the "New version" banner, so the app can
      // never change underneath someone mid-mission.
  );
});

/* ACTIVATE: throw away caches from older versions, so an iPad does not slowly
   fill up with every release we ever made. */
self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (names) {
      return Promise.all(
        names.filter(function (name) { return name !== CACHE_VERSION; })
             .map(function (name) { return caches.delete(name); })
      );
    }).then(function () { return self.clients.claim(); })
  );
});

/* FETCH: answer from the cache first, and only ask the network if we have no
   copy. The app never talks to anything but itself (spec §3), so there is no
   fresh content to miss by preferring the cache.

   A network reply is quietly added to the cache, which covers files added to
   the app without this list being updated. */
self.addEventListener('fetch', function (event) {
  const request = event.request;

  // Only ever handle plain GETs for our own files.
  if (request.method !== 'GET') return;
  if (new URL(request.url).origin !== self.location.origin) return;

  event.respondWith(
    caches.match(request).then(function (cached) {
      if (cached) return cached;

      return fetch(request).then(function (response) {
        // Opaque or failed responses are not worth keeping.
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        const copy = response.clone();
        caches.open(CACHE_VERSION).then(function (cache) {
          cache.put(request, copy);
        });
        return response;
      }).catch(function () {
        /* Offline and not in the cache. For a page request, hand back the app
           itself so the child still gets Agent Lab rather than a dinosaur. */
        if (request.mode === 'navigate') return caches.match('./index.html');
        return new Response('', { status: 504, statusText: 'Offline' });
      });
    })
  );
});

/* The page asks us to take over when the child taps "New version — tap to
   update" (spec §9). Until then the new worker simply waits. */
self.addEventListener('message', function (event) {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});
