// Seed list. Each entry is a pair of equivalent forms (lowercase).
// Grow this over time as misclassifications are spotted.
const VARIANT_PAIRS: [string, string][] = [
  ["&", "and"],
  ["saviour", "savior"],
  ["judgement", "judgment"],
  ["honour", "honor"],
  ["honoured", "honored"],
  ["labour", "labor"],
  ["favour", "favor"],
  ["centre", "center"],
  ["thru", "through"],
  // Manuscript spellings shorter than MIN_VARIANT_LEN, which the edit-distance
  // gate cannot reach. Counts are pm vs 2013 occurrences.
  ["shew", "show"],
  ["shewn", "shown"],
  ["thot", "that"],
  ["ore", "are"],
  ["woe", "wo"],
  ["domb", "dumb"],
  ["oar", "ore"],
  // Past the edit-distance gate rather than under the length one. Loosening
  // that gate to reach them would also swallow saith/said, their/the and
  // wrote/written, so they are curated instead.
  ["desipels", "disciples"],
  ["plane", "plain"],
  ["bourn", "borne"],
  ["tho", "though"],
];

function pairKey(a: string, b: string): string {
  return a < b ? `${a} ${b}` : `${b} ${a}`;
}

const KNOWN = new Set(VARIANT_PAIRS.map(([a, b]) => pairKey(a, b)));

export function isKnownVariant(a: string, b: string): boolean {
  if (a === b) return false;
  return KNOWN.has(pairKey(a, b));
}
