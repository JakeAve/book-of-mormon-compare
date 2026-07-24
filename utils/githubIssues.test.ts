import { assertEquals } from "@std/assert";
import { createIssue, GITHUB_REPO } from "@/utils/githubIssues.ts";

Deno.test("createIssue — posts to the repo issues endpoint with auth", async () => {
  let captured: { url: string; init: RequestInit } | null = null;
  const fakeFetch = ((url: string | URL | Request, init?: RequestInit) => {
    captured = { url: String(url), init: init ?? {} };
    return Promise.resolve(
      new Response(
        JSON.stringify({ html_url: "https://github.com/x/issues/1" }),
        { status: 201 },
      ),
    );
  }) as typeof fetch;

  const result = await createIssue(
    { title: "t", body: "b", labels: ["correction"] },
    "tok",
    fakeFetch,
  );

  assertEquals(result, {
    ok: true,
    issueUrl: "https://github.com/x/issues/1",
    status: 201,
  });
  assertEquals(
    captured!.url,
    `https://api.github.com/repos/${GITHUB_REPO}/issues`,
  );
  const headers = new Headers(captured!.init.headers);
  assertEquals(headers.get("authorization"), "Bearer tok");
  const sent = JSON.parse(captured!.init.body as string);
  assertEquals(sent, { title: "t", body: "b", labels: ["correction"] });
});

Deno.test("createIssue — reports failure status", async () => {
  const fakeFetch =
    (() =>
      Promise.resolve(new Response("nope", { status: 401 }))) as typeof fetch;
  const result = await createIssue(
    { title: "t", body: "b", labels: [] },
    "bad",
    fakeFetch,
  );
  assertEquals(result.ok, false);
  assertEquals(result.status, 401);
});

Deno.test("createIssue — reports network errors as not ok", async () => {
  const fakeFetch = (() => Promise.reject(new Error("boom"))) as typeof fetch;
  const result = await createIssue(
    { title: "t", body: "b", labels: [] },
    "tok",
    fakeFetch,
  );
  assertEquals(result.ok, false);
});
