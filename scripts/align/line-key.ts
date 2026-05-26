// `${page}:${line}` is the stable key for a source line — used throughout the
// pipeline to look up LineInfo, group results by line, and assign suffix
// letters when one line covers multiple verses. Keep construction and parsing
// here so the format never drifts.

export function lineKey(page: number, line: number): string {
  return `${page}:${line}`;
}

export function parseLineKey(k: string): { page: number; line: number } {
  const sep = k.indexOf(":");
  const page = Number(k.slice(0, sep));
  const line = Number(k.slice(sep + 1));
  if (!Number.isFinite(page) || !Number.isFinite(line)) {
    throw new Error(`invalid line key: ${k}`);
  }
  return { page, line };
}

export function verseKey(book: string, chapter: number, verse: number): string {
  return `${book}|${chapter}|${verse}`;
}
