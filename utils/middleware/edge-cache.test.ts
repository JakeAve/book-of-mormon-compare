import { assertEquals } from "@std/assert";
import { Context } from "fresh";
import { createEdgeCacheMiddleware } from "@/utils/middleware/edge-cache.ts";

function run(
  url: string,
  { method = "GET", response = new Response("ok") } = {},
) {
  const ctx = {
    req: new Request(url, { method }),
    url: new URL(url),
    next: () => Promise.resolve(response),
  } as unknown as Context<unknown>;
  return createEdgeCacheMiddleware()(ctx);
}

const CACHE_HEADER = "public, s-maxage=86400, stale-while-revalidate=86400";

Deno.test("caches GET page responses", async () => {
  const res = await run("https://x.test/alma/5?v1=pm&v2=2013");
  assertEquals(res.headers.get("Cache-Control"), CACHE_HEADER);
});

Deno.test("skips non-GET, non-200, admin paths, and existing headers", async () => {
  const cases: [string, Parameters<typeof run>[1]][] = [
    ["https://x.test/report-correction", { method: "POST" }],
    ["https://x.test/missing", { response: new Response("", { status: 404 }) }],
    ["https://x.test/bans", {}],
    ["https://x.test/report-correction", {}],
    ["https://x.test/sitemap.xml", {
      response: new Response("", {
        headers: { "Cache-Control": "public, max-age=1" },
      }),
    }],
  ];
  for (const [url, opts] of cases) {
    const res = await run(url, opts);
    assertEquals(res.headers.get("Cache-Control") === CACHE_HEADER, false, url);
  }
});
