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
