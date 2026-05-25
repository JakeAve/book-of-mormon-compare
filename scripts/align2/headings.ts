// Detect chapter/book headings in source manuscript lines and map them to
// canonical book slugs. Headings act as hard anchors that segment the source
// and let the cursor jump to the correct book when drift accumulates.

export function isChapterHeading(text: string): boolean {
  const t = normalize(text);
  // ^ anchor prevents mid-sentence false positives. Book names are restricted
  // to known BoM books so "book of Moses", "book of Lamb" etc. don't fire.
  return (
    /^chapter\s+([ivxlc]+|[0-9]+)\b/.test(t) ||
    /^the (first|second|third|fourth) book of\b/.test(t) ||
    /^the book of (nephi|jacob|enos|jarom|omni|mosiah|alma|helaman|mormon|ether|moroni)\b/
      .test(t) ||
    /^words of mormon\b/.test(t)
  );
}

export function normalizeHeading(text: string): string {
  return normalize(text);
}

// Map a normalized segment heading to the canonical book slug it starts.
// Returns null for chapter headings (which don't change the book).
export function headingToBook(normalized: string): string | null {
  if (/^the book of mormon\b/.test(normalized)) return "title-page";
  // 1-ne: "his" immediately follows "Nephi" — unique to 1 Nephi heading
  if (/^the book of nephi\s+his\b/.test(normalized)) return "1-ne";
  if (/^the first book of nephi\b/.test(normalized)) return "1-ne";
  if (/^the second book of nephi\b/.test(normalized)) return "2-ne";
  // 3-ne: requires "son of nephi" to exclude mid-text references
  if (/^the book of nephi\b.*\bson of nephi\b/.test(normalized)) return "3-ne";
  if (/^the book of jacob\b/.test(normalized)) return "jacob";
  if (/^the book of enos\b/.test(normalized)) return "enos";
  if (/^the book of jarom\b/.test(normalized)) return "jarom";
  if (/^the book of omni\b/.test(normalized)) return "omni";
  if (/^words of mormon\b/.test(normalized)) return "w-of-m";
  if (/^the book of mosiah\b/.test(normalized)) return "mosiah";
  if (/^the book of alma\b/.test(normalized)) return "alma";
  if (/^the book of helaman\b/.test(normalized)) return "hel";
  if (/^the book of ether\b/.test(normalized)) return "ether";
  if (/^the book of moroni\b/.test(normalized)) return "moro";
  return null;
}

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ")
    .trim();
}
