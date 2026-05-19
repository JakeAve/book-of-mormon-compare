export function parseMarkParam(raw: string | null): Set<number> | null {
  if (!raw) return null;
  const result = new Set<number>();
  for (const segment of raw.split(",")) {
    const trimmed = segment.trim();
    if (trimmed.includes("-")) {
      const [a, b] = trimmed.split("-").map(Number);
      if (!Number.isInteger(a) || !Number.isInteger(b) || a < 1 || b < a) {
        return null;
      }
      for (let v = a; v <= b; v++) result.add(v);
    } else {
      const n = Number(trimmed);
      if (!Number.isInteger(n) || n < 1) return null;
      result.add(n);
    }
  }
  return result.size > 0 ? result : null;
}

export function serializeMarkParam(verses: Set<number>): string {
  const sorted = [...verses].sort((a, b) => a - b);
  const segments: string[] = [];
  let i = 0;
  while (i < sorted.length) {
    let j = i;
    while (j + 1 < sorted.length && sorted[j + 1] === sorted[j] + 1) j++;
    segments.push(j > i ? `${sorted[i]}-${sorted[j]}` : `${sorted[i]}`);
    i = j + 1;
  }
  return segments.join(",");
}
