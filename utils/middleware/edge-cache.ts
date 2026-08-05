import { Context } from "fresh";

const NO_CACHE_PATHS = ["/bans", "/report-correction"];

export function createEdgeCacheMiddleware(maxAgeSeconds = 86400) {
  return async function (ctx: Context<unknown>): Promise<Response> {
    const response = await ctx.next();
    if (
      ctx.req.method !== "GET" ||
      response.status !== 200 ||
      response.headers.has("Cache-Control") ||
      NO_CACHE_PATHS.some((p) => ctx.url.pathname.startsWith(p))
    ) {
      return response;
    }
    response.headers.set(
      "Cache-Control",
      `public, s-maxage=${maxAgeSeconds}, stale-while-revalidate=86400`,
    );
    return response;
  };
}
