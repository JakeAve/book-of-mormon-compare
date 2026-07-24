import { log } from "@/lib/logger.ts";

export const GITHUB_REPO = "JakeAve/book-of-mormon-compare";

export interface CreateIssueResult {
  ok: boolean;
  issueUrl?: string;
  status?: number;
}

export async function createIssue(
  opts: { title: string; body: string; labels: string[] },
  token: string,
  fetchFn: typeof fetch = fetch,
): Promise<CreateIssueResult> {
  try {
    const res = await fetchFn(
      `https://api.github.com/repos/${GITHUB_REPO}/issues`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Accept": "application/vnd.github+json",
          "Content-Type": "application/json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
        body: JSON.stringify(opts),
      },
    );
    if (!res.ok) {
      log("error", "github_issue_create_failed", { status: res.status });
      await res.body?.cancel();
      return { ok: false, status: res.status };
    }
    const data = await res.json() as { html_url?: string };
    return { ok: true, issueUrl: data.html_url, status: res.status };
  } catch (err) {
    log("error", "github_issue_create_error", {
      error: (err as Error).message,
    });
    return { ok: false };
  }
}
