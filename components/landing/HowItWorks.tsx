const FEATURES = [
  {
    title: "Word-level differences",
    description:
      "Every added, removed, or altered word is highlighted individually.",
  },
  {
    title: "Manuscript markup, preserved",
    description:
      "Deletions, insertions, and unclear passages from the original scribes are marked exactly as recorded.",
  },
  {
    title: "Trace a word across editions",
    description:
      "Click any word to highlight every matching instance in both columns at once.",
  },
] as const;

export default function HowItWorks() {
  return (
    <section class="landing-scroll-reveal px-6 py-10 sm:py-14">
      <div class="max-w-3xl mx-auto flex flex-col gap-8">
        <p class="landing-eyebrow text-center">How it works</p>
        <div class="grid sm:grid-cols-3 gap-8 sm:gap-6">
          {FEATURES.map((f) => (
            <div key={f.title} class="flex flex-col gap-2 text-center">
              <span
                aria-hidden="true"
                style={{ color: "var(--color-accent)", fontSize: "1.25rem" }}
              >
                §
              </span>
              <p
                class="font-serif text-lg font-semibold"
                style={{ color: "var(--color-text)" }}
              >
                {f.title}
              </p>
              <p
                class="font-serif text-sm leading-relaxed"
                style={{ color: "var(--color-muted)" }}
              >
                {f.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
