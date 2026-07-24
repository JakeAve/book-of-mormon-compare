import { define } from "@/utils/state.ts";
import {
  buildIssueBody,
  buildIssueTitle,
  extractReportFromIssueBody,
  isDuplicateReport,
  parseCorrectionReport,
} from "@/lib/correctionReport.ts";
import { DenoKvReportRateStore } from "@/db/kv.ts";
import type { ReportRateStore } from "@/db/interface.ts";
import { createIssue, listOpenIssues } from "@/utils/githubIssues.ts";
import { log } from "@/lib/logger.ts";
import { getClientIp } from "@/utils/clientIp.ts";

let storePromise: Promise<ReportRateStore> | null = null;

function getStore(): Promise<ReportRateStore> {
  if (!storePromise) {
    storePromise = Deno.openKv().then((kv) => new DenoKvReportRateStore(kv));
  }
  return storePromise;
}

function json(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const handler = define.handlers({
  async POST(ctx) {
    let payload: unknown;
    try {
      payload = await ctx.req.json();
    } catch {
      return json(400, { ok: false, error: "invalid json" });
    }

    const honeypot = (payload as Record<string, unknown> | null)?.website;
    if (typeof honeypot === "string" && honeypot !== "") {
      return json(200, { ok: true });
    }

    const ip = getClientIp(ctx.info.remoteAddr);
    const store = await getStore();
    const { allowed } = await store.recordReport(ip);
    if (!allowed) {
      log("warn", "report_rate_limited", { ip });
      return json(429, { ok: false, error: "rate_limited" });
    }

    const parsed = parseCorrectionReport(payload);
    if (!parsed.ok) {
      return json(400, { ok: false, error: parsed.error });
    }

    const token = Deno.env.get("GITHUB_TOKEN");
    if (!token) {
      log("error", "report_no_github_token", { ip });
      return json(503, { ok: false, error: "unavailable" });
    }

    // Duplicate reports get the same success response as fresh ones, linked
    // to the existing issue — the reporter shouldn't have to care. Open
    // issues are the source of truth: once one is fixed and closed, new
    // reports for that verse go through again. If the lookup fails, create
    // anyway — a double report beats a lost one.
    const existing = await listOpenIssues("correction", token);
    if (existing.ok) {
      for (const issue of existing.issues) {
        const report = extractReportFromIssueBody(issue.body);
        if (report && isDuplicateReport(report, parsed.report)) {
          log("info", "report_duplicate", {
            ip,
            book: parsed.report.book,
            chapter: parsed.report.chapter,
            issue_url: issue.htmlUrl,
          });
          return json(200, { ok: true, issueUrl: issue.htmlUrl });
        }
      }
    }

    const result = await createIssue(
      {
        title: buildIssueTitle(parsed.report),
        body: buildIssueBody(parsed.report),
        labels: ["correction"],
      },
      token,
    );
    if (!result.ok) {
      return json(503, { ok: false, error: "unavailable" });
    }

    log("info", "report_submitted", {
      ip,
      book: parsed.report.book,
      chapter: parsed.report.chapter,
      issue_url: result.issueUrl ?? "",
    });
    return json(200, { ok: true, issueUrl: result.issueUrl });
  },
});
