import { Context } from "fresh";
import { log } from "@/lib/logger.ts";
import type { SecurityService } from "@/utils/security.ts";

export function createIpBlockMiddleware(security: SecurityService) {
  return async function (ctx: Context<unknown>): Promise<Response> {
    const ip = ctx.req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
      "";
    if (ip && await security.isBanned(ip)) {
      log("warn", "blocked_request", {
        ip,
        path: ctx.url.pathname,
        reason: "ip_banned",
      });
      return new Response(null, { status: 403 });
    }
    return ctx.next();
  };
}
