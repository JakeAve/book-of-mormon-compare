export default function Hero() {
  return (
    <section class="landing-hero flex flex-col items-center text-center gap-6 px-6 pt-14 pb-10 sm:pt-20 sm:pb-14">
      <p class="landing-eyebrow">Manuscripts · Editions · Revisions</p>
      <h1
        class="landing-display text-[2.5rem] leading-[1.05] sm:text-6xl lg:text-7xl max-w-4xl"
        style={{ color: "var(--color-text)" }}
      >
        Every Change to the Book of Mormon, Side by Side
      </h1>
      <p
        class="font-serif text-base sm:text-lg leading-relaxed max-w-xl"
        style={{ color: "var(--color-muted)" }}
      >
        From the 1829 dictation to today's printed edition, compare the text
        word for word.
      </p>
      <div class="flex flex-col sm:flex-row items-center gap-4 mt-2">
        <a
          href="/witnesses/1"
          class="font-serif text-base sm:text-lg px-7 py-3 rounded-sm"
          style={{
            backgroundColor: "var(--color-chip-active-bg)",
            color: "var(--color-chip-active-fg)",
          }}
        >
          Start comparing →
        </a>
        <a
          href="/versions"
          class="font-serif text-base sm:text-lg underline underline-offset-4"
          style={{ color: "var(--color-text)" }}
        >
          Browse the versions
        </a>
      </div>
    </section>
  );
}
