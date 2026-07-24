import { log } from "@/lib/logger.ts";
import type { SecurityStore } from "@/db/interface.ts";

export type BanReason = "probe_path" | "rate_limit_404";

export const PROBE_PATTERNS: RegExp[] = [
  /\/\.env/,
  /\/\.git/,
  /\/\.npmrc/,
  /\/\.yarn/,
  /\/\.ssh/,
  /\/\.aws/,
  /\/\.docker/,
  /\/\.stripe/,
  /\/\.bash_history/,
  /\/\.netrc/,
  /\/\.htpasswd/,
  /config/i,
  /^\/api\//,
  /^\/backend\//,
  /\/wp-/,
  /\/phpmy/,
];

export class SecurityService {
  constructor(private store: SecurityStore) {}

  isProbe(path: string): boolean {
    let decoded = path;
    try {
      decoded = decodeURIComponent(path);
    } catch {
      // malformed percent-encoding is itself suspicious; fall through and
      // match against the raw path
    }
    return PROBE_PATTERNS.some((p) => p.test(path) || p.test(decoded));
  }

  isBanned(ip: string): Promise<boolean> {
    return this.store.isBanned(ip);
  }

  async countBans(): Promise<number> {
    return (await this.store.listBans()).length;
  }

  listBans(): Promise<string[]> {
    return this.store.listBans();
  }

  async unbanIp(ip: string): Promise<void> {
    await this.store.unban(ip);
    log("info", "ip_unbanned", { ip });
  }

  async banIp(
    ip: string,
    triggerPath: string,
    reason: BanReason,
  ): Promise<void> {
    await this.store.setBan(ip);
    log("warn", "ip_banned", { ip, trigger_path: triggerPath, reason });
  }

  async record404(ip: string): Promise<void> {
    const { hitThreshold } = await this.store.record404(ip);
    if (hitThreshold) {
      await this.banIp(ip, "404", "rate_limit_404");
    }
  }
}
