import { define } from "@/utils/state.ts";
import { getSiteUrl } from "@/lib/config.ts";

export const handler = define.handlers({
  GET(ctx) {
    const siteUrl = getSiteUrl();
    ctx.state.head = {
      title: "Textual Criticism — Book of Mormon Compare",
      description:
        "An introduction to textual criticism as applied to the Book of Mormon: the transmission chain, categories of change, and key scholarly resources.",
      imageUrl: `${siteUrl}/og-image?book=1-ne&chapter=1&v1=pm&v2=2013`,
      pageUrl: `${siteUrl}/textual-criticism`,
      canonicalUrl: `${siteUrl}/textual-criticism`,
    };
    return { data: {} };
  },
});

export default define.page<typeof handler>(() => {
  return (
    <main
      class="flex flex-col gap-8 max-w-2xl mx-auto px-6 pt-10 pb-16 font-serif text-base leading-relaxed"
      style={{ color: "var(--color-text)" }}
    >
      <h1 class="text-3xl font-semibold">Textual Criticism</h1>

      <section class="flex flex-col gap-3">
        <h2 class="text-xl font-semibold">What is textual criticism</h2>
        <p>
          Textual criticism is the discipline of reconstructing a text's history
          by comparing its surviving manuscript and print witnesses. Developed
          primarily in the study of classical and biblical literature, it
          identifies copying errors, scribal interventions, editorial changes,
          and transmission variants — the accumulated differences that arise
          each time a text is transcribed, typeset, or revised.
        </p>
        <p>
          The goal is not to produce a single "correct" text but to understand
          what happened to a text over time: which variants are original, which
          were introduced, and what each stage of transmission can tell us about
          the text and its history.
        </p>
      </section>

      <section class="flex flex-col gap-3">
        <h2 class="text-xl font-semibold">
          The Book of Mormon as a textual object
        </h2>
        <p>
          The Book of Mormon presents an unusual case for textual-critical
          study. No autograph exists; the text originates in dictation rather
          than authorial manuscript. Yet two early manuscript witnesses survive
          — the Original Manuscript and the Printer's Manuscript — alongside a
          clear chain of printed editions extending to the present. For a
          19th-century religious text, this is a comparatively rich documentary
          record.
        </p>
        <p>
          The dictation origin raises questions distinct from most
          textual-critical problems. Scribal errors in the Original Manuscript
          are errors of hearing rather than sight; the distinction between
          "original text" and "authorial text" is complicated by the nature of
          the translation process. These questions have made the Book of Mormon
          an active area of textual-critical inquiry since at least the 1980s.
        </p>
      </section>

      <section class="flex flex-col gap-3">
        <h2 class="text-xl font-semibold">The transmission chain</h2>
        <p>
          Each link in the following chain introduces its own class of
          variation:
        </p>
        <ol class="flex flex-col gap-2 list-decimal pl-6">
          <li>
            <strong>Dictation</strong>{" "}
            — The source text, no longer directly accessible.
          </li>
          <li>
            <strong>Original Manuscript (OM)</strong>{" "}
            — Scribal transcription of the dictation. ~28% survives.
          </li>
          <li>
            <strong>Printer's Manuscript (PM)</strong>{" "}
            — Copied from OM by Oliver Cowdery. ~100% survives.
          </li>
          <li>
            <strong>1830 First Edition</strong>{" "}
            — Typeset from PM (and portions of OM). Introduces compositor
            variation.
          </li>
          <li>
            <strong>1837 Second Edition</strong>{" "}
            — ~3,000 supervised emendations, primarily grammatical.
          </li>
          <li>
            <strong>Subsequent editions</strong> — 1840, 1879, 1920, 1981, 2013.
          </li>
        </ol>
        <p>
          See <a href="/versions" class="underline">Versions</a>{" "}
          for a full description of each witness.
        </p>
      </section>

      <section class="flex flex-col gap-3">
        <h2 class="text-xl font-semibold">Categories of change</h2>
        <p>
          The variants between witnesses fall into several overlapping
          categories:
        </p>
        <dl class="flex flex-col gap-4">
          <div>
            <dt class="font-semibold">Orthographic</dt>
            <dd>
              Spelling standardization. The dictation text contains many
              non-standard spellings that were normalized at the PM stage and
              again in print.
            </dd>
          </div>
          <div>
            <dt class="font-semibold">Grammatical and syntactic</dt>
            <dd>
              Regularization of non-standard constructions present in the
              dictation — verb agreement, pronoun forms, relative clauses. The
              1837 edition concentrated heavily on this category.
            </dd>
          </div>
          <div>
            <dt class="font-semibold">Semantic</dt>
            <dd>
              Substitutions that alter meaning, whether intentionally or through
              scribal error. These require case-by-case analysis.
            </dd>
          </div>
          <div>
            <dt class="font-semibold">Doctrinal clarifications</dt>
            <dd>
              A small but heavily studied set of changes, concentrated in the
              1837 edition, where revisions appear to reflect developing
              theological understanding rather than textual correction.
            </dd>
          </div>
        </dl>
      </section>

      <section class="flex flex-col gap-3">
        <h2 class="text-xl font-semibold">Scholarly resources</h2>
        <ul class="flex flex-col gap-2 list-disc pl-6">
          <li>
            Royal Skousen,{" "}
            <em>The Original Manuscript of the Book of Mormon</em> (FARMS, 2001)
          </li>
          <li>
            Royal Skousen,{" "}
            <em>The Printer's Manuscript of the Book of Mormon</em>{" "}
            (FARMS, 2001)
          </li>
          <li>
            Royal Skousen,{" "}
            <em>Analysis of Textual Variants of the Book of Mormon</em>{" "}
            (6 vols., FARMS, 2004-2009)
          </li>
          <li>
            Royal Skousen, <em>The Book of Mormon: The Earliest Text</em>{" "}
            (Yale UP, 2009)
          </li>
          <li>
            <a
              href="https://www.josephsmithpapers.org"
              class="underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Joseph Smith Papers Project
            </a>{" "}
            — documentary transcriptions of the Original and Printer's
            Manuscripts
          </li>
          <li>
            Grant Hardy, <em>Understanding the Book of Mormon</em>{" "}
            (Oxford UP, 2010)
          </li>
        </ul>
      </section>

      <section class="flex flex-col gap-3">
        <h2 class="text-xl font-semibold">How this tool fits in</h2>
        <p>
          Consulting a single witness in isolation gives no view of variation.
          This tool places any two witnesses side-by-side at the word level,
          making it possible to trace specific variants across the transmission
          chain without consulting multiple physical volumes or switching
          between tabs.
        </p>
        <p>
          <a href="/" class="underline">Open the reader →</a>
        </p>
      </section>
    </main>
  );
});
