import { define } from "@/utils/state.ts";
import { getSiteUrl } from "@/lib/config.ts";
import { buildBreadcrumbList } from "@/lib/breadcrumbs.ts";
import { buildDataset } from "@/lib/structuredData.ts";
import { BOOK_ORDER, VERSION_ORDER } from "@/lib/data.ts";
import { VERSION_INFO } from "@/lib/versionInfo.ts";
import { CHAPTER_COUNTS } from "@/lib/bookChapters.ts";

export const handler = define.handlers({
  GET(ctx) {
    const siteUrl = getSiteUrl();
    ctx.state.head = {
      title: "Versions — Book of Mormon Compare",
      description:
        "Descriptions of each Book of Mormon version available for comparison: Original Manuscript, Printer's Manuscript, 1830, 1837, 1840, 1841, and 2013 editions.",
      imageUrl: `${siteUrl}/og-default.png`,
      pageUrl: `${siteUrl}/versions`,
      canonicalUrl: `${siteUrl}/versions`,
    };
    return { data: {} };
  },
});

export default define.page<typeof handler>(() => {
  const siteUrl = getSiteUrl();
  const chapterCount = BOOK_ORDER.reduce((n, b) => n + CHAPTER_COUNTS[b], 0);
  const breadcrumb = buildBreadcrumbList([
    { name: "Home", url: `${siteUrl}/` },
    { name: "Versions", url: `${siteUrl}/versions` },
  ]);
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      buildDataset({
        siteUrl,
        versionCount: VERSION_ORDER.length,
        chapterCount,
      }),
      {
        "@type": "BreadcrumbList",
        "itemListElement": breadcrumb.itemListElement,
      },
    ],
  };

  return (
    <main
      class="flex flex-col gap-10 max-w-2xl mx-auto px-6 pt-10 pb-16 font-serif text-base leading-relaxed"
      style={{ color: "var(--color-text)" }}
    >
      <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      <h1 class="text-3xl font-semibold">Versions</h1>
      <p>
        In textual criticism, any surviving document that transmits a text —
        whether a manuscript or a printed publication — is called a{" "}
        <strong>witness</strong>. The following witnesses to the Book of Mormon
        text are available for comparison, presented in transmission order.
      </p>

      {VERSION_ORDER.map((key) => {
        const info = VERSION_INFO[key];
        return (
          <section key={key} class="flex flex-col gap-3">
            <h2 class="text-xl font-semibold">
              <a href={`/versions/${key}`} class="underline">{info.name}</a>
            </h2>
            <p>{info.summary}</p>
            <p>
              <a href={`/versions/${key}`} class="underline">
                About the {info.shortName} →
              </a>
            </p>
          </section>
        );
      })}
    </main>
  );
});
