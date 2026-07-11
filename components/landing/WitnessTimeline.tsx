const EARLY_WITNESSES = [
  {
    label: "Original Manuscript",
    date: "1828–29",
    description:
      "The scribes' record of Joseph Smith's dictation — the closest surviving witness to the spoken text.",
  },
  {
    label: "Printer's Manuscript",
    date: "1829",
    description:
      "Oliver Cowdery's copy of the Original Manuscript, prepared as the compositor's working text.",
  },
  {
    label: "1830 First Edition",
    date: "1830",
    description:
      "Typeset in Palmyra, New York — the first printed Book of Mormon.",
  },
] as const;

export default function WitnessTimeline() {
  return (
    <section class="px-6 py-10 sm:py-14">
      <div class="max-w-3xl mx-auto flex flex-col gap-8">
        <div class="flex flex-col gap-3 text-center">
          <p class="landing-eyebrow">The witnesses</p>
          <h2
            class="landing-display text-3xl sm:text-4xl"
            style={{ color: "var(--color-text)" }}
          >
            What survives, and what it preserves
          </h2>
          <p
            class="font-serif text-base leading-relaxed max-w-xl mx-auto"
            style={{ color: "var(--color-muted)" }}
          >
            In textual criticism, any surviving document that transmits a text —
            a manuscript or a printed edition — is called a{" "}
            <em>witness</em>. Each witness to the Book of Mormon captures the
            text at a different point in its history, and comparing them reveals
            exactly what changed between one and the next.
          </p>
        </div>

        <ol class="flex flex-col sm:flex-row gap-6 sm:gap-4">
          {EARLY_WITNESSES.map((w) => (
            <li
              key={w.label}
              class="flex-1 flex flex-col gap-1 pl-4 sm:pl-0 sm:pt-4 border-l sm:border-l-0 sm:border-t border-[var(--color-divider)]"
            >
              <p
                class="landing-eyebrow"
                style={{ color: "var(--color-accent)" }}
              >
                {w.date}
              </p>
              <p
                class="font-serif text-lg font-semibold"
                style={{ color: "var(--color-text)" }}
              >
                {w.label}
              </p>
              <p
                class="font-serif text-sm leading-relaxed"
                style={{ color: "var(--color-muted)" }}
              >
                {w.description}
              </p>
            </li>
          ))}
        </ol>

        <p class="text-center">
          <a
            href="/versions"
            class="font-serif underline underline-offset-4"
            style={{ color: "var(--color-text)" }}
          >
            See the full list of versions →
          </a>
        </p>
      </div>
    </section>
  );
}
