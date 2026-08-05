import { define } from "@/utils/state.ts";
import { getSiteUrl } from "@/lib/config.ts";
import { BOOK_ORDER, VERSION_ORDER } from "@/lib/data.ts";
import { CHAPTER_COUNTS, CHAPTERLESS_BOOKS } from "@/lib/bookChapters.ts";
import {
  CANONICAL_V1,
  CANONICAL_V2,
  loadVariantStats,
} from "@/lib/variantStats.ts";

const STATIC_PAGES_LASTMOD = "2026-07-29";

function urlEntry(loc: string, lastmod: string): string {
  return `  <url><loc>${loc}</loc><lastmod>${lastmod}</lastmod></url>`;
}

export const handler = define.handlers({
  async GET() {
    const base = getSiteUrl();
    const stats = await loadVariantStats();
    const dataLastmod = stats.generatedAt || STATIC_PAGES_LASTMOD;
    const pair = `?v1=${CANONICAL_V1}&amp;v2=${CANONICAL_V2}`;

    const staticUrls = [
      urlEntry(`${base}/`, STATIC_PAGES_LASTMOD),
      urlEntry(`${base}/about`, STATIC_PAGES_LASTMOD),
      urlEntry(`${base}/versions`, STATIC_PAGES_LASTMOD),
      urlEntry(`${base}/textual-criticism`, STATIC_PAGES_LASTMOD),
    ];

    const versionUrls = VERSION_ORDER.map((key) =>
      urlEntry(`${base}/versions/${key}`, STATIC_PAGES_LASTMOD)
    );

    const hubUrls = BOOK_ORDER
      .filter((book) => !CHAPTERLESS_BOOKS.has(book))
      .map((book) => urlEntry(`${base}/${book}`, dataLastmod));

    const chapterUrls = BOOK_ORDER.flatMap((book) =>
      Array.from(
        { length: CHAPTER_COUNTS[book] },
        (_, i) => urlEntry(`${base}/${book}/${i + 1}${pair}`, dataLastmod),
      )
    );

    const xml = [
      `<?xml version="1.0" encoding="UTF-8"?>`,
      `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
      ...staticUrls,
      ...versionUrls,
      ...hubUrls,
      ...chapterUrls,
      `</urlset>`,
    ].join("\n");

    return new Response(xml, {
      headers: {
        "Content-Type": "application/xml",
        "Cache-Control": "public, max-age=86400",
      },
    });
  },
});
