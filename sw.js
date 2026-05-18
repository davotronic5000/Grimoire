import { clientsClaim } from 'workbox-core';
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst, CacheFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { RangeRequestsPlugin } from 'workbox-range-requests';

self.skipWaiting();
clientsClaim();

// Inject precache manifest at build time — all static assets, data files, icons
precacheAndRoute(self.__WB_MANIFEST, {
  ignoreURLParametersMatching: [/^utm_/, /^fbclid$/],
});
cleanupOutdatedCaches();

const NINETY_DAYS = 90 * 24 * 60 * 60;
const ONE_YEAR    = 365 * 24 * 60 * 60;

// The /game page is fully client-side: the server always renders the same
// loading-spinner shell regardless of the ?id= param. Normalising all
// /game?id=X requests to a single cache key means one cached entry covers
// every game — including ones created offline that have never been fetched.
const gameKeyPlugin = {
  cacheKeyWillBeUsed: async ({ request }) => {
    const url = new URL(request.url);
    if (url.pathname === '/game') {
      return new URL('/game', url.origin).href;
    }
    return request.url;
  },
};

// ── Start URL ──────────────────────────────────────────────────────────────
// NetworkFirst so the home page stays fresh, with opaque-redirect handling
// for iOS standalone mode.
registerRoute(
  '/',
  new NetworkFirst({
    cacheName: 'start-url',
    plugins: [
      {
        cacheWillUpdate: async ({ response }) => {
          if (response?.type === 'opaqueredirect') {
            return new Response(response.body, {
              status: 200,
              statusText: 'OK',
              headers: response.headers,
            });
          }
          return response;
        },
      },
    ],
  }),
  'GET'
);

// ── Next.js RSC requests (prefetch + navigation) ───────────────────────────
// Both use the same cache so that a prefetch of /game (triggered on home-page
// load) satisfies a later navigation RSC request to /game?id=NEW_ID.
// gameKeyPlugin collapses all /game?id=* keys into one entry.
registerRoute(
  ({ request, url, sameOrigin }) =>
    request.headers.get('RSC') === '1' &&
    sameOrigin &&
    !url.pathname.startsWith('/api/'),
  new StaleWhileRevalidate({
    cacheName: 'pages-rsc',
    plugins: [
      gameKeyPlugin,
      new ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: NINETY_DAYS }),
    ],
  }),
  'GET'
);

// ── Page HTML navigation ───────────────────────────────────────────────────
registerRoute(
  ({ url, sameOrigin }) => sameOrigin && !url.pathname.startsWith('/api/'),
  new StaleWhileRevalidate({
    cacheName: 'pages',
    plugins: [
      gameKeyPlugin,
      new ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: NINETY_DAYS }),
    ],
  }),
  'GET'
);

// ── Next.js static chunks ──────────────────────────────────────────────────
// Content-hashed filenames → CacheFirst is safe; files are already in the
// precache manifest but this covers any runtime-loaded chunks.
registerRoute(
  /\/_next\/static.+\.js$/i,
  new CacheFirst({
    cacheName: 'next-static-js',
    plugins: [new ExpirationPlugin({ maxEntries: 128, maxAgeSeconds: ONE_YEAR })],
  }),
  'GET'
);

registerRoute(
  /\/_next\/image\?url=.+$/i,
  new StaleWhileRevalidate({
    cacheName: 'next-image',
    plugins: [new ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: NINETY_DAYS })],
  }),
  'GET'
);

// ── Static CSS ─────────────────────────────────────────────────────────────
registerRoute(
  /\.(?:css|less)$/i,
  new StaleWhileRevalidate({
    cacheName: 'static-style',
    plugins: [new ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: ONE_YEAR })],
  }),
  'GET'
);

// ── Images ─────────────────────────────────────────────────────────────────
// Already in precache, but covers anything missed (e.g. dynamic sources).
registerRoute(
  /\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i,
  new StaleWhileRevalidate({
    cacheName: 'static-images',
    plugins: [new ExpirationPlugin({ maxEntries: 128, maxAgeSeconds: NINETY_DAYS })],
  }),
  'GET'
);

// ── Audio ──────────────────────────────────────────────────────────────────
// Already in precache; RangeRequestsPlugin for iOS audio seek support.
registerRoute(
  /\.(?:mp3|wav|ogg)$/i,
  new CacheFirst({
    cacheName: 'static-audio',
    plugins: [
      new RangeRequestsPlugin(),
      new ExpirationPlugin({ maxEntries: 16, maxAgeSeconds: ONE_YEAR }),
    ],
  }),
  'GET'
);

// ── JSON data ──────────────────────────────────────────────────────────────
// All /public/data/*.json files are in the precache manifest; this is a
// belt-and-suspenders runtime rule for anything not in the manifest.
registerRoute(
  /\.(?:json|xml|csv)$/i,
  new StaleWhileRevalidate({
    cacheName: 'static-data',
    plugins: [new ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: NINETY_DAYS })],
  }),
  'GET'
);
