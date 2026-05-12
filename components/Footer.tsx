export default function Footer() {
  return (
    <footer
      class="mt-auto px-6 py-8 text-center text-sm font-serif leading-relaxed"
      style={{ color: "var(--color-text-muted, var(--color-text))", borderTop: "1px solid var(--color-border, currentColor)", opacity: 0.6 }}
    >
      <p class="max-w-2xl mx-auto mb-2">
        This project is an independent study and research tool. It is not
        affiliated with, endorsed by, or sponsored by The Church of Jesus
        Christ of Latter-day Saints, the Community of Christ, or any other
        church or organization. All scriptural text belongs to its respective
        publishers; this site presents it for comparative study.
      </p>
      <p>© {new Date().getFullYear()} scripturecompare.org</p>
    </footer>
  );
}
