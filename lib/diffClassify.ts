import type { DiffKind } from "./diff.ts";
import { isPunctuation } from "./textHelpers.ts";
import { levenshtein } from "./editDistance.ts";
import { isKnownVariant } from "./spellingVariants.ts";

const MAX_VARIANT_DISTANCE = 3;
const MAX_VARIANT_RATIO = 0.34;
const MIN_VARIANT_LEN = 5;

function stripPunct(s: string): string {
  return s.replace(/^[^\p{L}\p{N}&]+|[^\p{L}\p{N}&]+$/gu, "");
}

export function classifySubstitution(oldVal: string, newVal: string): DiffKind {
  if (isPunctuation(oldVal) || isPunctuation(newVal)) return "wordChange";

  if (oldVal.toLowerCase() === newVal.toLowerCase()) return "capitalization";

  const a = stripPunct(oldVal).toLowerCase();
  const b = stripPunct(newVal).toLowerCase();

  if (isKnownVariant(a, b)) return "spelling";

  const dist = levenshtein(a, b);
  const maxLen = Math.max(a.length, b.length);
  if (
    maxLen >= MIN_VARIANT_LEN && dist <= MAX_VARIANT_DISTANCE &&
    dist / maxLen <= MAX_VARIANT_RATIO
  ) {
    return "spelling";
  }

  return "wordChange";
}
