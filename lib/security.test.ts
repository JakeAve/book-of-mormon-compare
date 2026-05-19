import { assertEquals } from "@std/assert";
import { SecurityService } from "@/utils/security.ts";

async function makeService(): Promise<[SecurityService, Deno.Kv]> {
  const kv = await Deno.openKv(":memory:");
  return [new SecurityService(kv), kv];
}

Deno.test("isProbe — blocks observed traffic", async () => {
  const [svc, kv] = await makeService();
  try {
    const blocked = [
      "/backend/.env",
      "/api/.env",
      "/.git/config",
      "/.env.production",
      "/.env.local",
      "/.env.development",
    ];
    for (const path of blocked) {
      assertEquals(svc.isProbe(path), true, `expected ${path} to be blocked`);
    }
  } finally {
    kv.close();
  }
});

Deno.test("isProbe — passes real routes", async () => {
  const [svc, kv] = await makeService();
  try {
    const allowed = [
      // real app routes
      "/witnesses/1",
      "/1-ne/1",
      "/about",
      "/",
      // honest-mistake 404s — real users mistyping book names
      "/1-nephi/1",
      "/1-nephi",
      "/info",
      "/mosiah/1",
      "/enos/1",
      "/jacob/1",
      "/alma/1",
      // og-image route
      "/og-image",
    ];
    for (const path of allowed) {
      assertEquals(svc.isProbe(path), false, `expected ${path} to pass`);
    }
  } finally {
    kv.close();
  }
});

Deno.test("isBanned — returns false for unknown IP", async () => {
  const [svc, kv] = await makeService();
  try {
    assertEquals(await svc.isBanned("1.2.3.4"), false);
  } finally {
    kv.close();
  }
});

Deno.test("banIp + isBanned — ban persists", async () => {
  const [svc, kv] = await makeService();
  try {
    assertEquals(await svc.isBanned("1.2.3.4"), false);
    await svc.banIp("1.2.3.4", "/.env", "probe_path");
    assertEquals(await svc.isBanned("1.2.3.4"), true);
  } finally {
    kv.close();
  }
});

Deno.test("banIp — logs ip_banned JSON to stdout", async () => {
  const [svc, kv] = await makeService();
  const logged: string[] = [];
  const orig = console.log;
  console.log = (msg: string) => logged.push(msg);
  try {
    await svc.banIp("5.6.7.8", "/api/.env", "probe_path");
    assertEquals(logged.length, 1);
    const entry = JSON.parse(logged[0]);
    assertEquals(entry.type, "ip_banned");
    assertEquals(entry.ip, "5.6.7.8");
    assertEquals(entry.trigger_path, "/api/.env");
    assertEquals(entry.reason, "probe_path");
    assertEquals(typeof entry.ts, "string");
  } finally {
    console.log = orig;
    kv.close();
  }
});

Deno.test("record404 — does not ban below threshold", async () => {
  const [svc, kv] = await makeService();
  try {
    for (let i = 0; i < 9; i++) {
      await svc.record404("9.9.9.9");
    }
    assertEquals(await svc.isBanned("9.9.9.9"), false);
  } finally {
    kv.close();
  }
});

Deno.test("record404 — bans IP at threshold", async () => {
  const [svc, kv] = await makeService();
  try {
    for (let i = 0; i < 10; i++) {
      await svc.record404("10.0.0.1");
    }
    assertEquals(await svc.isBanned("10.0.0.1"), true);
  } finally {
    kv.close();
  }
});

Deno.test("record404 — resets count after window expires", async () => {
  const [svc, kv] = await makeService();
  try {
    const ip = "10.0.0.2";
    const expiredStart = Date.now() - 11 * 60 * 1000;
    await kv.set(["404_count", ip], 9);
    await kv.set(["404_window", ip], expiredStart);
    await svc.record404(ip);
    assertEquals(await svc.isBanned(ip), false);
  } finally {
    kv.close();
  }
});
