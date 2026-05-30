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
];

function pairKey(a: string, b: string): string {
  return a < b ? `${a} ${b}` : `${b} ${a}`;
}

const KNOWN = new Set(VARIANT_PAIRS.map(([a, b]) => pairKey(a, b)));

export function isKnownVariant(a: string, b: string): boolean {
  if (a === b) return false;
  return KNOWN.has(pairKey(a, b));
}
