import { Context } from "fresh";
import { log } from "@/lib/logger.ts";
import type { SecurityService } from "@/utils/security.ts";
import { getClientIp } from "@/utils/clientIp.ts";

export function createIpBlockMiddleware(security: SecurityService) {
  return async function (ctx: Context<unknown>): Promise<Response> {
    const ip = getClientIp(ctx.info.remoteAddr);
    if (await security.isBanned(ip)) {
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
