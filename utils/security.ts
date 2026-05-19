export type BanReason = "probe_path" | "rate_limit_404";

export const PROBE_PATTERNS: RegExp[] = [
  /\/\.env/,
  /\/\.git/,
  /\/\.npmrc/,
  /\/\.yarn/,
  /config/i,
  /^\/api\//,
  /^\/backend\//,
  /\/wp-/,
  /\/phpmy/,
];

export const KV_PREFIX = "bofm-compare";

export const KV_KEYS = {
  BAN: "ban",
  RATE_COUNT: "rate_count",
  RATE_WINDOW: "rate_window",
} as const;

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_THRESHOLD = 10;

export class SecurityService {
  readonly #prefix: string;

  constructor(private kv: Deno.Kv, prefix = KV_PREFIX) {
    this.#prefix = prefix;
  }

  #banKey(ip: string): Deno.KvKey {
    return [this.#prefix, KV_KEYS.BAN, ip];
  }

  #countKey(ip: string): Deno.KvKey {
    return [this.#prefix, KV_KEYS.RATE_COUNT, ip];
  }

  #windowKey(ip: string): Deno.KvKey {
    return [this.#prefix, KV_KEYS.RATE_WINDOW, ip];
  }

  isProbe(path: string): boolean {
    return PROBE_PATTERNS.some((p) => p.test(path));
  }

  async isBanned(ip: string): Promise<boolean> {
    const entry = await this.kv.get<boolean>(this.#banKey(ip));
    return entry.value === true;
  }

  async banIp(
    ip: string,
    triggerPath: string,
    reason: BanReason,
  ): Promise<void> {
    await this.kv.set(this.#banKey(ip), true);
    console.log(JSON.stringify({
      type: "ip_banned",
      ip,
      trigger_path: triggerPath,
      reason,
      ts: new Date().toISOString(),
    }));
  }

  async record404(ip: string): Promise<void> {
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
        if (newCount >= RATE_LIMIT_THRESHOLD) {
          await this.banIp(ip, "404", "rate_limit_404");
        }
        break;
      }
    }
  }
}
