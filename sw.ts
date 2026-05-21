/// <reference lib="webworker" />
import { cleanupOutdatedCaches, precacheAndRoute } from "workbox-precaching";
import { registerRoute } from "workbox-routing";
import {
  CacheFirst,
  NetworkOnly,
  StaleWhileRevalidate,
} from "workbox-strategies";
import { BroadcastUpdatePlugin } from "workbox-broadcast-update";
import { ExpirationPlugin } from "workbox-expiration";

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>;
};

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

const NETWORK_ONLY_PATHS = ["/og-image", "/sitemap.xml", "/robots.txt"];

function isSlowConnection(): boolean {
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
        plugins: [new ExpirationPlugin({ maxEntries: 100 })],
      }).handle(context);
    }
    return await new StaleWhileRevalidate({
      cacheName: "navigation-cache",
      plugins: [
        new BroadcastUpdatePlugin(),
        new ExpirationPlugin({ maxEntries: 100 }),
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

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
