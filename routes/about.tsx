import { define } from "@/utils/state.ts";
import { getSiteUrl } from "@/lib/config.ts";
import { buildBreadcrumbList } from "@/lib/breadcrumbs.ts";

export const handler = define.handlers({
  GET(ctx) {
    const siteUrl = getSiteUrl();
    ctx.state.head = {
      title: "About — Book of Mormon Compare",
      description:
        "About Book of Mormon Compare: a tool for textual-critical study of Book of Mormon manuscripts and editions.",
      imageUrl: `${siteUrl}/og-default.png`,
      pageUrl: `${siteUrl}/about`,
      canonicalUrl: `${siteUrl}/about`,
    };
    return { data: {} };
  },
});

export default define.page<typeof handler>(() => {
  const siteUrl = getSiteUrl();
  const jsonLd = buildBreadcrumbList([
    { name: "Home", url: `${siteUrl}/` },
    { name: "About", url: `${siteUrl}/about` },
  ]);

  return (
    <main
      class="flex flex-col gap-8 max-w-2xl mx-auto px-6 pt-10 pb-16 font-serif text-base leading-relaxed"
      style={{ color: "var(--color-text)" }}
    >
      <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      <h1 class="text-3xl font-semibold">About</h1>

      <section class="flex flex-col gap-3">
        <h2 class="text-xl font-semibold">What this is</h2>
        <p>
          Book of Mormon Compare is a tool for textual-critical study of the
          Book of Mormon. It presents manuscript and print witnesses
          side-by-side, with word-level differences highlighted so that
          additions, deletions, and substitutions between any two versions are
          immediately visible.
        </p>
        <p>
          Available versions span the documentary record from early manuscripts
          through modern printed editions. See{" "}
          <a href="/versions" class="underline">Versions</a>{" "}
          for details on each one.
        </p>
      </section>

      <section class="flex flex-col gap-3">
        <h2 class="text-xl font-semibold">Textual criticism</h2>
        <p>
          Textual criticism is the discipline of reconstructing a text's history
          by comparing its surviving manuscript and print witnesses. Developed
          primarily in the study of classical and biblical literature, it
          identifies copying errors, scribal interventions, editorial changes,
          and transmission variants — the accumulated differences that arise
          each time a text is copied, typeset, or revised.
        </p>
        <p>
          The Book of Mormon presents an unusual case in this field. No
          autograph exists; the text originates in dictation rather than
          authorial manuscript. Yet two early manuscript witnesses survive — the
          Original Manuscript and the Printer's Manuscript — alongside a clear
          chain of printed editions. This gives scholars a more complete
          documentary record than is typical for 19th-century texts of
          comparable length.
        </p>
        <p>
          For a fuller treatment of the transmission chain, categories of
          change, and key scholarly resources, see{" "}
          <a href="/textual-criticism" class="underline">
            Textual Criticism
          </a>.
        </p>
      </section>

      <section class="flex flex-col gap-3">
        <h2 class="text-xl font-semibold">Sources</h2>
        <p>
          Manuscript transcriptions are drawn from the{" "}
          <a
            href="https://www.josephsmithpapers.org"
            class="underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            Joseph Smith Papers Project
          </a>{" "}
          who sourced from Royal Skousen's{" "}
          <a
            href="https://criticaltext.byustudies.byu.edu"
            class="underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            Critical Text Project
          </a>. The Original Manuscript fragments and Printer's Manuscript are
          now held at the Church History Library, Salt Lake City.
        </p>
        <p>
          Printed editions have been sourced from Joseph Smith Papers, online
          archives and their respective publishers.
        </p>
      </section>

      <section class="flex flex-col gap-3">
        <h2 class="text-xl font-semibold">How to use it</h2>
        <ul class="flex flex-col gap-2 list-disc pl-6">
          <li>
            Pick a version for each column using the selectors at the top of the
            reader.
          </li>
          <li>
            Use the &lt; and &gt; arrows to move between chapters, or tap the
            chapter title to jump to any book and chapter.
          </li>
          <li>
            Click any word to highlight every matching word in both columns —
            useful for tracing a phrase across editions.
          </li>
          <li>
            Where a chapter exists in one edition but not the other, the missing
            side is marked "Non-extant."
          </li>
        </ul>
        <p>
          <a href="/" class="underline">Open the reader →</a>
        </p>
      </section>
    </main>
  );
});
