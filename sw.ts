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
        cacheName: "navigation-cache",
        plugins: [
          new ExpirationPlugin({
            maxEntries: 100,
            maxAgeSeconds: 30 * 24 * 60 * 60,
          }),
        ],
      }).handle(context);
    }
    return await new StaleWhileRevalidate({
      cacheName: "navigation-cache",
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
