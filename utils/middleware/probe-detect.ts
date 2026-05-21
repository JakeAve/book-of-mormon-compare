import { Context } from "fresh";
import { log } from "@/lib/logger.ts";
import type { SecurityService } from "@/utils/security.ts";

export function createProbeDetectMiddleware(security: SecurityService) {
  return async function (ctx: Context<unknown>): Promise<Response> {
    const ip = ctx.req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
      "";
    const path = ctx.url.pathname;

    if (security.isProbe(path)) {
      if (ip) await security.banIp(ip, path, "probe_path");
      log("warn", "blocked_request", { ip, path, reason: "probe_path" });
      return new Response(null, { status: 403 });
    }

    const response = await ctx.next();

    if (response.status === 404 && ip) {
      await security.record404(ip);
    }

    return response;
  };
}
