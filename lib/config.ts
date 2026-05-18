export function getSiteUrl(): string {
  return Deno.env.get("SITE_URL") ?? "https://bofm.scripturecompare.org";
}
