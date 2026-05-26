import { Context } from "fresh";
import { log } from "@/lib/logger.ts";

export function createRequestLogMiddleware() {
  return async function (ctx: Context<unknown>): Promise<Response> {
    const start = performance.now();
    const response = await ctx.next();
    log("info", "page_view", {
      path: ctx.url.pathname,
      status: response.status,
      durationMs: Math.round(performance.now() - start),
    });
    return response;
  };
}
