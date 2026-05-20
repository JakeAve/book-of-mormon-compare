import { define } from "@/utils/state.ts";
import { getSiteUrl } from "@/lib/config.ts";
import { BOOK_ORDER } from "@/lib/data.ts";
import { CHAPTER_COUNTS } from "@/lib/bookChapters.ts";

export const handler = define.handlers({
  GET() {
    const base = getSiteUrl();

    const chapterUrls = BOOK_ORDER.flatMap((book) => {
      const count = CHAPTER_COUNTS[book];
      return Array.from({ length: count }, (_, i) => {
        const chapter = i + 1;
        return `  <url><loc>${base}/${book}/${chapter}?v1=pm&amp;v2=2013</loc></url>`;
      });
    });

    const xml = [
      `<?xml version="1.0" encoding="UTF-8"?>`,
      `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
      `  <url><loc>${base}/about</loc></url>`,
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
