export type MatchLevel = 0 | 1 | 2 | 3 | 4;

const _dictionary = new Map<string, string>();

export function addDictionaryEntry(scribal: string, canonical: string): void {
  _dictionary.set(scribal, canonical);
}

export function clearDictionary(): void {
  _dictionary.clear();
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const prev = new Uint16Array(n + 1);
  const curr = new Uint16Array(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      curr[j] = a[i - 1] === b[j - 1]
        ? prev[j - 1]
        : 1 + Math.min(prev[j], curr[j - 1], prev[j - 1]);
    }
    prev.set(curr);
  }
  return prev[n];
}

function levThreshold(len: number): number {
  if (len <= 5) return 1;
  if (len <= 9) return 2;
  return 3;
}

function compareNormalized(a: string, b: string): MatchLevel {
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (
    a[0] === b[0] &&
    a[a.length - 1] === b[b.length - 1] &&
    Math.abs(a.length - b.length) <= 2
  ) return 2;
  if (levenshtein(a, b) <= levThreshold(Math.max(a.length, b.length))) return 3;
  return 0;
}

export function matchQuality(a: string, b: string): MatchLevel {
  const direct = compareNormalized(a, b);
  if (direct > 0) return direct;
  const mapped = _dictionary.get(a);
  if (mapped !== undefined && compareNormalized(mapped, b) > 0) return 4;
  return 0;
}

export function matches(a: string, b: string): boolean {
  return matchQuality(a, b) > 0;
}
