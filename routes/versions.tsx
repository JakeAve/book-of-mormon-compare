import { define } from "@/utils/state.ts";
import { getSiteUrl } from "@/lib/config.ts";
import { buildBreadcrumbList } from "@/lib/breadcrumbs.ts";

export const handler = define.handlers({
  GET(ctx) {
    const siteUrl = getSiteUrl();
    ctx.state.head = {
      title: "Versions — Book of Mormon Compare",
      description:
        "Descriptions of each Book of Mormon version available for comparison: Original Manuscript, Printer's Manuscript, 1830, 1837, 1840, and 2013 editions.",
      imageUrl: `${siteUrl}/og-default.png`,
      pageUrl: `${siteUrl}/versions`,
      canonicalUrl: `${siteUrl}/versions`,
    };
    return { data: {} };
  },
});

export default define.page<typeof handler>(() => {
  const siteUrl = getSiteUrl();
  const jsonLd = buildBreadcrumbList([
    { name: "Home", url: `${siteUrl}/` },
    { name: "Versions", url: `${siteUrl}/versions` },
  ]);

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

      <section class="flex flex-col gap-3">
        <h2 class="text-xl font-semibold">Original Manuscript</h2>
        <p>
          Dictated in 1829 by Joseph Smith to a rotating group of scribes,
          primarily Oliver Cowdery. It is the closest surviving witness to the
          dictation text, preserving spellings, readings, and word choices not
          present in any later witness.
        </p>
        <p>
          In 1841 Joseph Smith placed the manuscript in the cornerstone of the
          Nauvoo House. The seal eventually broke, exposing the pages to
          moisture and mold. When Lewis Bidamon — Emma Smith's second husband —
          renovated the building in 1882, he found the manuscript severely
          damaged. Of the nearly 500 original pages, portions of only 232
          survived (roughly 28% total). Bidamon distributed the remaining pages
          to visitors and missionaries as souvenirs. Most extant fragments were
          eventually consolidated at the Church History Library, Salt Lake City,
          where they have been transcribed by Royal Skousen as part of the
          Critical Text Project.
        </p>
        <p>
          <a href="/1-ne/1?v1=om&v2=2013" class="underline">
            Compare Original Manuscript →
          </a>
        </p>
      </section>

      <section class="flex flex-col gap-3">
        <h2 class="text-xl font-semibold">Printer's Manuscript</h2>
        <p>
          Transcribed from the Original Manuscript by Oliver Cowdery in
          1829-1830. Nearly 100% extant. It served as the compositor's copy for
          the 1830 first edition, except for portions where pages of the
          Original Manuscript were delivered directly to the printer. As the
          most complete early manuscript witness, the PM is the foundation of
          most critical text work. Transcription errors introduced during
          copying — and corrections made by Cowdery and others — are visible
          when compared against the Original Manuscript.
        </p>
        <p>
          After printing, Cowdery retained the manuscript. Before his death in
          1850 he passed it to fellow witness and brother-in-law David Whitmer,
          whose family preserved it until Whitmer's grandson sold it to the
          Reorganized Church of Jesus Christ of Latter Day Saints (now Community
          of Christ) in 1903 for $2,500. The Church of Jesus Christ of
          Latter-day Saints purchased it in 2017 for $35 million; it is now held
          at the Church History Library, Salt Lake City.
        </p>
        <p>
          <a href="/1-ne/1?v1=pm&v2=2013" class="underline">
            Compare Printer's Manuscript →
          </a>
        </p>
      </section>

      <section class="flex flex-col gap-3">
        <h2 class="text-xl font-semibold">1830 First Edition</h2>
        <p>
          Typeset from the Printer's Manuscript (and portions of the Original
          Manuscript) and published by E.B. Grandin in Palmyra, New York, with a
          first print run of approximately 5,000 copies. The first several
          printings, including the 1830 edition, have no versification; the text
          is divided into large narrative chapters with no further subdivision.
        </p>
        <p>
          The typesetting process introduced a new layer of variation:
          compositor changes, house-style normalization, and a small number of
          editorial interventions. Comparing the 1830 edition against the
          manuscripts reveals this layer directly. Not all 1830 editions are
          identical because deviations were caught and corrected during the
          printing process after some leafs were already printed. The 1830
          edition in this project is sourced from the transcription made
          available by the{" "}
          <a
            target="_blank"
            href="https://www.josephsmithpapers.org/paper-summary/book-of-mormon-1830/1"
            rel="noopener noreferrer"
            class="underline"
          >
            Joseph Smith Paper's project on document ID 7272.
          </a>
        </p>
        <p>
          <a href="/1-ne/1?v1=1830&v2=2013" class="underline">
            Compare 1830 First Edition →
          </a>
        </p>
      </section>

      <section class="flex flex-col gap-3">
        <h2 class="text-xl font-semibold">1837 Second Edition</h2>
        <p>
          Published in Kirtland, Ohio. Joseph Smith personally supervised
          approximately 3,000 emendations, the large majority of which are
          grammatical and syntactic — regularizing non-standard verb forms,
          pronoun agreements, and other constructions present in the dictation
          text. A smaller set of changes carries semantic or theological weight
          and has received considerable scholarly attention.
        </p>
        <p>
          The 1837 edition in this project is sourced from the transcription
          made available by the{" "}
          <a
            target="_blank"
            href="https://www.josephsmithpapers.org/paper-summary/book-of-mormon-1837/1"
            rel="noopener noreferrer"
            class="underline"
          >
            Joseph Smith Paper's project on document ID 7273.
          </a>
        </p>
        <p>
          <a href="/1-ne/1?v1=1837&v2=2013" class="underline">
            Compare 1837 Second Edition →
          </a>
        </p>
      </section>

      <section class="flex flex-col gap-3">
        <h2 class="text-xl font-semibold">1840 Nauvoo Edition</h2>
        <p>
          The third edition, printed at the Cincinnati firm of Shepard & Stearns
          under the direction of Ebenezer Robinson. Unlike the largely
          grammatical 1837 revision, Joseph Smith personally compared the 1830
          and 1837 printings against the Original Manuscript for this edition,
          restoring readings lost when the Printer's Manuscript was copied and
          correcting further compositor errors accumulated over two printings.
          The most notable resulting change corrected the description of the
          Nephites from "white and delightsome" to "pure and delightsome."
        </p>
        <p>
          After heavily relying on the Original Manuscript for this edition,
          Joseph Smith placed the manuscript in the cornerstone of the Nauvoo
          House on October 2, 1841. Unfortunately it suffered significant water
          damage by the time it was recovered.
        </p>
        <p>
          The 1840 edition in this project is sourced from the images made
          available by the{" "}
          <a
            target="_blank"
            href="https://www.josephsmithpapers.org/paper-summary/book-of-mormon-1840/1"
            rel="noopener noreferrer"
            class="underline"
          >
            Joseph Smith Paper's project on document ID 7274.
          </a>
        </p>
        <p>
          <a href="/1-ne/1?v1=1840&v2=2013" class="underline">
            Compare 1840 Nauvoo Edition →
          </a>
        </p>
      </section>

      <section class="flex flex-col gap-3">
        <h2 class="text-xl font-semibold">
          2013 Church of Jesus Christ of Latter-day Saint Edition
        </h2>
        <p>
          The current edition published by The Church of Jesus Christ of
          Latter-day Saints. Descended from the 1837 edition through subsequent
          revisions in 1840, 1879, 1920, 1981, and 2013. The most common witness
          printed and read today.
        </p>
        <p>
          <a href="/1-ne/1?v1=pm&v2=2013" class="underline">
            Compare 2013 Edition →
          </a>
        </p>
      </section>
    </main>
  );
});
