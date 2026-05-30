/// <reference lib="webworker" />
import { clientsClaim } from "workbox-core";
import { cleanupOutdatedCaches, precacheAndRoute } from "workbox-precaching";
import { registerRoute, setCatchHandler } from "workbox-routing";
import {
  CacheFirst,
  NetworkOnly,
  StaleWhileRevalidate,
} from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>;
};

// __BUILD_ID__ is replaced with Date.now() by swProcessFix in vite.config.ts.
// Each build gets a unique cache so old HTML (referencing old-hashed assets)
// can never be served by a new SW that has already cleaned up those old assets.
declare const __BUILD_ID__: string;
const NAV_CACHE = `navigation-cache-__BUILD_ID__`;

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();
clientsClaim();

const OFFLINE_CACHE = "offline-fallback";
const OFFLINE_URL = "/offline";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(OFFLINE_CACHE).then((cache) =>
      cache.add(new Request(OFFLINE_URL, { cache: "reload" }))
    ),
  );
});

// On activate: migrate entries from old navigation-cache-* caches into the new
// versioned cache, then delete the old ones. Fetches fresh HTML when online so
// the new cache is immediately coherent with the new precached assets. Falls
// back to copying the stale response when offline (content is still readable;
// JS hydration may fail until the user reconnects and revalidates).
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      const oldNavCaches = names.filter(
        (n) => n.startsWith("navigation-cache-") && n !== NAV_CACHE,
      );
      if (oldNavCaches.length === 0) return;
      const dest = await caches.open(NAV_CACHE);
      for (const name of oldNavCaches) {
        const old = await caches.open(name);
        const keys = await old.keys();
        await Promise.all(
          keys.map(async (req) => {
            if (await dest.match(req)) return;
            try {
              const fresh = await fetch(req);
              if (fresh.ok) await dest.put(req, fresh);
            } catch {
              const stale = await old.match(req);
              if (stale) await dest.put(req, stale);
            }
          }),
        );
        await caches.delete(name);
      }
    })(),
  );
});

const NETWORK_ONLY_PATHS = ["/og-image", "/sitemap.xml", "/robots.txt"];

function isSlowConnection(): boolean {
  if (!navigator.onLine) return true;
  const conn =
    (navigator as unknown as { connection?: { effectiveType: string } })
      .connection;
  if (!conn) return false;
  return conn.effectiveType === "slow-2g" || conn.effectiveType === "2g";
}

registerRoute(
  ({ url }) => NETWORK_ONLY_PATHS.some((p) => url.pathname.startsWith(p)),
  new NetworkOnly(),
);

registerRoute(
  ({ request }) => request.mode === "navigate",
  async (context) => {
    if (isSlowConnection()) {
      return await new CacheFirst({
        cacheName: NAV_CACHE,
        plugins: [
          new ExpirationPlugin({
            maxEntries: 100,
            maxAgeSeconds: 30 * 24 * 60 * 60,
          }),
        ],
      }).handle(context);
    }
    return await new StaleWhileRevalidate({
      cacheName: NAV_CACHE,
      plugins: [
        new ExpirationPlugin({
          maxEntries: 100,
          maxAgeSeconds: 30 * 24 * 60 * 60,
        }),
      ],
    }).handle(context);
  },
);

registerRoute(
  ({ url }) => url.pathname === "/logo.svg" || url.pathname === "/favicon.ico",
  new CacheFirst({
    cacheName: "static-assets",
    plugins: [new ExpirationPlugin({ maxAgeSeconds: 30 * 24 * 60 * 60 })],
  }),
);

setCatchHandler(async ({ request }) => {
  if (request.mode === "navigate") {
    const cached = await caches.match(OFFLINE_URL, {
      cacheName: OFFLINE_CACHE,
    });
    if (cached) return cached;
  }
  return Response.error();
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
