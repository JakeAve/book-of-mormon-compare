export default function SeoSections() {
  return (
    <section class="px-6 py-10 sm:py-14">
      <div class="max-w-3xl mx-auto grid sm:grid-cols-2 gap-10 sm:gap-12">
        <div class="flex flex-col gap-3">
          <h2
            class="landing-display text-2xl sm:text-3xl"
            style={{ color: "var(--color-text)" }}
          >
            Why the text changed
          </h2>
          <p
            class="font-serif text-base leading-relaxed"
            style={{ color: "var(--color-muted)" }}
          >
            No original manuscript survives untouched — the Book of Mormon
            reached print through dictation, hand copying, and repeated
            typesetting, and each stage left its own mark. Scribes occasionally
            misheard or miscopied a word. Compositors adjusted spelling and
            punctuation to house style. Later editions corrected grammar,
            standardized wording, and fixed errors that had crept in along the
            way. Comparing any two witnesses side by side shows these changes
            directly, without relying on a secondhand summary of what differs.
          </p>
          <p>
            <a
              href="/textual-criticism"
              class="font-serif underline underline-offset-4"
              style={{ color: "var(--color-text)" }}
            >
              Read about the transmission history →
            </a>
          </p>
        </div>

        <div class="flex flex-col gap-3">
          <h2
            class="landing-display text-2xl sm:text-3xl"
            style={{ color: "var(--color-text)" }}
          >
            Versions and editions
          </h2>
          <p
            class="font-serif text-base leading-relaxed"
            style={{ color: "var(--color-muted)" }}
          >
            The Book of Mormon's documentary record spans handwritten
            manuscripts from 1828–29 through the current printed edition, with
            several editions in between. Each one is available here in full,
            matched verse for verse against any other, so you can pick two
            points in that record — an early manuscript and a modern printing,
            or two editions decades apart — and see exactly what separates them.
          </p>
          <p>
            <a
              href="/versions"
              class="font-serif underline underline-offset-4"
              style={{ color: "var(--color-text)" }}
            >
              Browse every version →
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}
