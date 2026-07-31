import { HttpError } from "fresh";
import { define } from "../../utils/state.ts";
import { getBookDisplayName, isBookAbbr } from "../../lib/data.ts";
import {
  buildChapterHref,
  CHAPTER_COUNTS,
  CHAPTERLESS_BOOKS,
} from "../../lib/bookChapters.ts";
import {
  bookDescription,
  bookHubTitle,
  bookIntroSentences,
  CANONICAL_V1,
  CANONICAL_V2,
  type ChapterVariantStats,
  formatCount,
  loadVariantStats,
} from "../../lib/variantStats.ts";
import { buildBreadcrumbList } from "../../lib/breadcrumbs.ts";
import { buildCollectionPage } from "../../lib/structuredData.ts";
import { JsonLd } from "../../components/JsonLd.tsx";
import { getSiteUrl } from "../../lib/config.ts";

interface HubData {
  book: string;
  bookName: string;
  intro: string[];
  chapters: Array<{ chapter: number; variantCount: number | null }>;
}

export const handler = define.handlers({
  async GET(ctx) {
    const { book } = ctx.params;
    if (CHAPTERLESS_BOOKS.has(book)) {
      return ctx.redirect(`/${book}/1${ctx.url.search}`);
    }
    if (!isBookAbbr(book)) throw new HttpError(404);

    const bookName = getBookDisplayName(book);
    const stats = await loadVariantStats();
    const records: ChapterVariantStats[] = stats.forBook(book);
    const byChapter = new Map(records.map((r) => [r.chapter, r]));

    const chapters = Array.from(
      { length: CHAPTER_COUNTS[book] },
      (_, i) => ({
        chapter: i + 1,
        variantCount: byChapter.get(i + 1)?.variantCount ?? null,
      }),
    );

    const fallbackDescription =
      `${bookName} is available for side-by-side comparison across every witness in the collection.`;
    const intro = records.length > 0
      ? bookIntroSentences(bookName, records)
      : [fallbackDescription];
    const description = records.length > 0
      ? bookDescription(bookName, records)
      : fallbackDescription;

    const siteUrl = getSiteUrl();
    ctx.state.head = {
      title: bookHubTitle(bookName),
      description,
      imageUrl: `${siteUrl}/og-default.png`,
      pageUrl: `${siteUrl}/${book}`,
      canonicalUrl: `${siteUrl}/${book}`,
    };

    return { data: { book, bookName, intro, chapters } as HubData };
  },
});

export default define.page<typeof handler>(({ data }) => {
  const { book, bookName, intro, chapters } = data;
  const siteUrl = getSiteUrl();
  const breadcrumb = buildBreadcrumbList([
    { name: "Home", url: `${siteUrl}/` },
    { name: bookName, url: `${siteUrl}/${book}` },
  ]);
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      buildCollectionPage({
        name: bookName,
        description: intro[0],
        url: `${siteUrl}/${book}`,
      }),
      {
        "@type": "BreadcrumbList",
        "itemListElement": breadcrumb.itemListElement,
      },
    ],
  };

  return (
    <main
      class="flex flex-col gap-8 max-w-2xl mx-auto px-6 pt-10 pb-16 font-serif text-base leading-relaxed"
      style={{ color: "var(--color-text)" }}
    >
      <JsonLd data={jsonLd} />

      <div class="flex flex-col gap-3">
        <h1 class="text-3xl font-semibold">{bookName}</h1>
        {intro.map((sentence, i) => <p key={i}>{sentence}</p>)}
      </div>

      <section class="flex flex-col gap-3">
        <h2 class="text-xl font-semibold">Chapters</h2>
        <ul class="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
          {chapters.map(({ chapter, variantCount }) => (
            <li
              key={chapter}
              class="border-b py-2"
              style={{ borderColor: "var(--color-divider)" }}
            >
              <a
                href={buildChapterHref(
                  book,
                  String(chapter),
                  CANONICAL_V1,
                  CANONICAL_V2,
                )}
                class="flex items-baseline justify-between gap-4"
              >
                <span class="underline">{bookName} {chapter}</span>
                <span
                  class="text-sm"
                  style={{ color: "var(--color-text)" }}
                >
                  {variantCount === null
                    ? "—"
                    : variantCount === 0
                    ? "no variants"
                    : `${formatCount(variantCount)} ${
                      variantCount === 1 ? "variant" : "variants"
                    }`}
                </span>
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section class="flex flex-col gap-2">
        <h2 class="text-xl font-semibold">Related</h2>
        <p>
          <a href="/versions" class="underline">
            All witnesses and editions →
          </a>
        </p>
        <p>
          <a href="/textual-criticism" class="underline">
            How these comparisons are made →
          </a>
        </p>
      </section>
    </main>
  );
});
