import type { ReportRateStore, SecurityStore } from "@/db/interface.ts";

export const KV_PREFIX = "bofm-compare";

export const KV_KEYS = {
  BAN: "ban",
  RATE_COUNT: "rate_count",
  RATE_WINDOW: "rate_window",
  REPORT_MIN_COUNT: "report_min_count",
  REPORT_MIN_WINDOW: "report_min_window",
  REPORT_HOUR_COUNT: "report_hour_count",
  REPORT_HOUR_WINDOW: "report_hour_window",
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

const REPORT_MINUTE_WINDOW_MS = 60 * 1000;
const REPORT_MINUTE_LIMIT = 3;
const REPORT_HOUR_WINDOW_MS = 60 * 60 * 1000;
const REPORT_HOUR_LIMIT = 30;

export class DenoKvReportRateStore implements ReportRateStore {
  constructor(private kv: Deno.Kv, private now: () => number = Date.now) {}

  #key(name: string, ip: string): Deno.KvKey {
    return [KV_PREFIX, name, ip];
  }

  async recordReport(ip: string): Promise<{ allowed: boolean }> {
    while (true) {
      const keys = [
        this.#key(KV_KEYS.REPORT_MIN_COUNT, ip),
        this.#key(KV_KEYS.REPORT_MIN_WINDOW, ip),
        this.#key(KV_KEYS.REPORT_HOUR_COUNT, ip),
        this.#key(KV_KEYS.REPORT_HOUR_WINDOW, ip),
      ];
      const [minCount, minWindow, hourCount, hourWindow] = await this.kv
        .getMany<[number, number, number, number]>(
          keys as [Deno.KvKey, Deno.KvKey, Deno.KvKey, Deno.KvKey],
        );
      const now = this.now();

      const minute = nextWindow(
        minCount.value,
        minWindow.value,
        now,
        REPORT_MINUTE_WINDOW_MS,
      );
      const hour = nextWindow(
        hourCount.value,
        hourWindow.value,
        now,
        REPORT_HOUR_WINDOW_MS,
      );

      const result = await this.kv.atomic()
        .check(minCount).check(minWindow).check(hourCount).check(hourWindow)
        .set(keys[0], minute.count)
        .set(keys[1], minute.windowStart)
        .set(keys[2], hour.count)
        .set(keys[3], hour.windowStart)
        .commit();

      if (result.ok) {
        return {
          allowed: minute.count <= REPORT_MINUTE_LIMIT &&
            hour.count <= REPORT_HOUR_LIMIT,
        };
      }
    }
  }
}

function nextWindow(
  count: number | null,
  windowStart: number | null,
  now: number,
  windowMs: number,
): { count: number; windowStart: number } {
  const start = windowStart ?? now;
  if (now - start > windowMs) return { count: 1, windowStart: now };
  return { count: (count ?? 0) + 1, windowStart: start };
}
