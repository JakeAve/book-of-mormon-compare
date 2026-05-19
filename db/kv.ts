import type { SecurityStore } from "@/db/interface.ts";

export const KV_PREFIX = "bofm-compare";

export const KV_KEYS = {
  BAN: "ban",
  RATE_COUNT: "rate_count",
  RATE_WINDOW: "rate_window",
} as const;

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_THRESHOLD = 10;

export class DenoKvSecurityStore implements SecurityStore {
  constructor(private kv: Deno.Kv) {}

  #banKey(ip: string): Deno.KvKey {
    return [KV_PREFIX, KV_KEYS.BAN, ip];
  }

  #countKey(ip: string): Deno.KvKey {
    return [KV_PREFIX, KV_KEYS.RATE_COUNT, ip];
  }

  #windowKey(ip: string): Deno.KvKey {
    return [KV_PREFIX, KV_KEYS.RATE_WINDOW, ip];
  }

  async isBanned(ip: string): Promise<boolean> {
    const entry = await this.kv.get<boolean>(this.#banKey(ip));
    return entry.value === true;
  }

  async setBan(ip: string): Promise<void> {
    await this.kv.set(this.#banKey(ip), true);
  }

  async record404(ip: string): Promise<{ hitThreshold: boolean }> {
    while (true) {
      const countEntry = await this.kv.get<number>(this.#countKey(ip));
      const windowEntry = await this.kv.get<number>(this.#windowKey(ip));
      const now = Date.now();
      const windowStart = windowEntry.value ?? now;
      const count = countEntry.value ?? 0;

      let newCount: number;
      let newWindowStart: number;

      if (now - windowStart > RATE_LIMIT_WINDOW_MS) {
        newCount = 1;
        newWindowStart = now;
      } else {
        newCount = count + 1;
        newWindowStart = windowStart;
      }

      const result = await this.kv.atomic()
        .check(countEntry)
        .check(windowEntry)
        .set(this.#countKey(ip), newCount)
        .set(this.#windowKey(ip), newWindowStart)
        .commit();

      if (result.ok) {
        return { hitThreshold: newCount >= RATE_LIMIT_THRESHOLD };
      }
    }
  }
}
