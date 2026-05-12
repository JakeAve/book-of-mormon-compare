export default function About() {
  return (
    <main
      class="flex flex-col gap-8 max-w-2xl mx-auto px-6 pt-10 pb-16 font-serif text-base leading-relaxed"
      style={{ color: "var(--color-text)" }}
    >
      <h1 class="text-3xl font-semibold">About</h1>

      <section class="flex flex-col gap-3">
        <h2 class="text-xl font-semibold">What this is</h2>
        <p>
          Book of Mormon Compare is a side-by-side reader for comparing
          different versions of the Book of Mormon. Verses are aligned across
          two columns, with word-level differences highlighted so that
          additions, removals, and edits between editions are easy to see.
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
            Use the &lt; and &gt; arrows to move between chapters, or tap the chapter
            title to jump to any book and chapter.
          </li>
          <li>
            Click any word to highlight every matching word in both columns —
            useful for tracing a phrase across editions.
          </li>
          <li>
            Where a chapter exists in one edition but not the other, the missing
            side is marked “Non-extant.”
          </li>
        </ul>
        <p>
          <a href="/" class="underline">Open the reader →</a>
        </p>
      </section>

      <section class="flex flex-col gap-3">
        <h2 class="text-xl font-semibold">Disclaimer</h2>
        <p>
          This project is an independent study and research tool. It is not
          affiliated with, endorsed by, or sponsored by The Church of Jesus
          Christ of Latter-day Saints, the Community of Christ, or any other
          church or organization. All scriptural text belongs to its respective
          publishers; this site presents it for comparative study.
        </p>
      </section>
    </main>
  );
}
