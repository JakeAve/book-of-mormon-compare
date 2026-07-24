import { timingSafeEqual as nodeTimingSafeEqual } from "node:crypto";
import { define } from "@/utils/state.ts";
import { DenoKvSecurityStore } from "@/db/kv.ts";
import { SecurityService } from "@/utils/security.ts";
import type { SecurityStore } from "@/db/interface.ts";

let servicePromise: Promise<SecurityService> | null = null;

function getService(): Promise<SecurityService> {
  if (!servicePromise) {
    servicePromise = Deno.openKv().then((kv) =>
      new SecurityService(new DenoKvSecurityStore(kv) as SecurityStore)
    );
  }
  return servicePromise;
}

function json(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function timingSafeEqual(a: string, b: string): boolean {
  const bytesA = new TextEncoder().encode(a);
  const bytesB = new TextEncoder().encode(b);
  if (bytesA.length !== bytesB.length) return false;
  return nodeTimingSafeEqual(bytesA, bytesB);
}

function checkAuth(req: Request): Response | null {
  const adminToken = Deno.env.get("ADMIN_TOKEN");
  if (!adminToken) {
    return json(503, { ok: false, error: "unavailable" });
  }

  const provided = req.headers.get("x-admin-token");
  if (!provided || !timingSafeEqual(provided, adminToken)) {
    return json(401, { ok: false, error: "unauthorized" });
  }

  return null;
}

export const handler = define.handlers({
  async GET(ctx) {
    const unauthorized = checkAuth(ctx.req);
    if (unauthorized) return unauthorized;

    const service = await getService();
    const ips = await service.listBans();
    return json(200, { ok: true, count: ips.length, ips });
  },

  async DELETE(ctx) {
    const unauthorized = checkAuth(ctx.req);
    if (unauthorized) return unauthorized;

    const ip = new URL(ctx.req.url).searchParams.get("ip");
    if (!ip) {
      return json(400, { ok: false, error: "missing ip" });
    }

    const service = await getService();
    if (!await service.isBanned(ip)) {
      return json(404, { ok: false, error: "not banned" });
    }

    await service.unbanIp(ip);
    return json(200, { ok: true, ip });
  },
});
