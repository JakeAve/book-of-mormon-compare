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

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_THRESHOLD = 10;

export class SecurityService {
  constructor(private kv: Deno.Kv) {}

  isProbe(path: string): boolean {
    return PROBE_PATTERNS.some((p) => p.test(path));
  }

  async isBanned(ip: string): Promise<boolean> {
    const entry = await this.kv.get<boolean>(["ban", ip]);
    return entry.value === true;
  }

  async banIp(
    ip: string,
    triggerPath: string,
    reason: BanReason,
  ): Promise<void> {
    await this.kv.set(["ban", ip], true);
    console.log(JSON.stringify({
      type: "ip_banned",
      ip,
      trigger_path: triggerPath,
      reason,
      ts: new Date().toISOString(),
    }));
  }

  async record404(ip: string): Promise<void> {
    const countKey: Deno.KvKey = ["404_count", ip];
    const windowKey: Deno.KvKey = ["404_window", ip];

    while (true) {
      const countEntry = await this.kv.get<number>(countKey);
      const windowEntry = await this.kv.get<number>(windowKey);
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
        .set(countKey, newCount)
        .set(windowKey, newWindowStart)
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
