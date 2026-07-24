import { assertEquals } from "@std/assert";
import { DenoKvReportRateStore } from "@/db/kv.ts";

Deno.test("recordReport — allows first 3 in a minute, blocks the 4th", async () => {
  const kv = await Deno.openKv(":memory:");
  try {
    const store = new DenoKvReportRateStore(kv);
    for (let i = 0; i < 3; i++) {
      const { allowed } = await store.recordReport("1.2.3.4");
      assertEquals(allowed, true, `report ${i + 1} should be allowed`);
    }
    const { allowed } = await store.recordReport("1.2.3.4");
    assertEquals(allowed, false);
  } finally {
    kv.close();
  }
});

Deno.test("recordReport — limits are per IP", async () => {
  const kv = await Deno.openKv(":memory:");
  try {
    const store = new DenoKvReportRateStore(kv);
    for (let i = 0; i < 4; i++) await store.recordReport("1.1.1.1");
    const { allowed } = await store.recordReport("2.2.2.2");
    assertEquals(allowed, true);
  } finally {
    kv.close();
  }
});

Deno.test("recordReport — hourly backstop blocks the 31st even if bursts are spaced", async () => {
  const kv = await Deno.openKv(":memory:");
  try {
    const store = new DenoKvReportRateStore(kv);
    let now = 0;
    const clock = () => now;
    const spaced = new DenoKvReportRateStore(kv, clock);
    let allowedCount = 0;
    for (let i = 0; i < 40; i++) {
      now = i * 61_000; // one report per 61s — never trips the minute window
      const { allowed } = await spaced.recordReport("3.3.3.3");
      if (allowed) allowedCount++;
    }
    assertEquals(allowedCount, 30);
    void store;
  } finally {
    kv.close();
  }
});

Deno.test("recordReport — minute window resets after 60s", async () => {
  const kv = await Deno.openKv(":memory:");
  try {
    let now = 0;
    const store = new DenoKvReportRateStore(kv, () => now);
    for (let i = 0; i < 3; i++) await store.recordReport("4.4.4.4");
    assertEquals((await store.recordReport("4.4.4.4")).allowed, false);
    now = 61_000;
    assertEquals((await store.recordReport("4.4.4.4")).allowed, true);
  } finally {
    kv.close();
  }
});
