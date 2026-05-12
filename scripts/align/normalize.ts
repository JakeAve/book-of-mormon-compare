// Text normalization for fuzzy comparison across Book of Mormon editions /
// manuscripts. Intentionally aggressive — we throw away as much surface noise
// as we can (punctuation, capitalization, ampersands, obvious archaic spellings)
// so that anchor matching sees the underlying word sequence.

import type { Token } from "./types.ts";

const SPELLING_FIXES: Array<[RegExp, string]> = [
  // Common Original Manuscript scribal variants → modern.
  [/\bobediant\b/g, "obedient"],
  [/\bvally\b/g, "valley"],
  [/\bempted\b/g, "emptied"],
  [/\bread sea\b/g, "red sea"],
  [/\bdestroid\b/g, "destroyed"],
  [/\bdearst\b/g, "durst"],
  [/\bimmagionations?\b/g, "imaginations"],
  [/\bheardness\b/g, "hardness"],
  [/\bstiffneckedness\b/g, "stiffneckedness"],
  [/\bbrethren\b/g, "brethren"],
  [/\bin\s+heritance\b/g, "inheritance"],
  [/\bpresance\b/g, "presence"],
  [/\bexceding\b/g, "exceeding"],
  [/\bhaveing\b/g, "having"],
  [/\bmakeing\b/g, "making"],
  [/\bwherfore\b/g, "wherefore"],
  // Generic doubled-consonant / -ll endings that diverge sometimes.
  [/\brebell\b/g, "rebel"],
];

export interface NormalizeOptions {
  /** Apply OM-specific spelling fixes. Default: true. */
  spelling?: boolean;
}

export function normalize(text: string, opts: NormalizeOptions = {}): string {
  let s = text.toLowerCase();
  // Strip OM markup the JSP transcript uses in `markdown` form, just in case.
  s = s.replace(/~~[^~]*~~/g, " "); // strikethrough = deleted, drop it
  s = s.replace(/\{\{|\}\}/g, " "); // editorial braces
  s = s.replace(/\[|\]/g, " "); // square brackets around supplied letters
  // Ampersand → "and".
  s = s.replace(/&/g, " and ");
  // Strip non-letter chars (keep apostrophes inside words then drop them).
  s = s.replace(/'/g, "");
  s = s.replace(/[^a-z0-9\s]/g, " ");
  if (opts.spelling !== false) {
    for (const [re, rep] of SPELLING_FIXES) s = s.replace(re, rep);
  }
  s = s.replace(/\s+/g, " ").trim();
  return s;
}

/** Split normalized text into bare word tokens. */
export function words(normalized: string): string[] {
  if (!normalized) return [];
  return normalized.split(" ");
}

/**
 * Build a flat token stream from a list of items, tagging each token with the
 * index of the item it came from. Items contribute zero tokens iff their text
 * normalizes to empty.
 */
export function tokenStream<T extends { text: string }>(
  items: T[],
  opts?: NormalizeOptions,
): Token[] {
  const out: Token[] = [];
  for (let i = 0; i < items.length; i++) {
    const ws = words(normalize(items[i].text, opts));
    for (const w of ws) out.push({ norm: w, ownerIdx: i });
  }
  return out;
}
