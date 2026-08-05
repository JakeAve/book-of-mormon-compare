export default function Footer() {
  return (
    <footer
      class="mt-auto px-6 py-8 text-center text-sm font-serif leading-relaxed"
      style={{
        color: "var(--color-muted)",
        borderTop: "1px solid var(--color-border, currentColor)",
        opacity: 0.6,
      }}
    >
      <nav class="flex justify-center gap-4 mb-4">
        <a href="/" class="underline">Home</a>
        <a href="/about" class="underline">About</a>
        <a href="/versions" class="underline">Versions</a>
        <a href="/textual-criticism" class="underline">Textual Criticism</a>
        <a
          href="https://github.com/JakeAve/book-of-mormon-compare"
          target="_blank"
          rel="noopener noreferrer"
          class="underline"
        >
          GitHub
        </a>
      </nav>
      <p class="max-w-2xl mx-auto mb-2">
        This project is an independent study and research tool. It is not
        affiliated with, endorsed by, or sponsored by The Church of Jesus Christ
        of Latter-day Saints, the Community of Christ, or any other church or
        organization. All scriptural text belongs to its respective publishers;
        this site presents it for comparative study.
      </p>
      <p>© {new Date().getFullYear()} scripturecompare.org</p>
    </footer>
  );
}
