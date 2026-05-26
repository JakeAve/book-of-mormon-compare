/**
 * Maps text word indices to markdown word indices. Deleted markdown words
 * (~~x~~ or ~~x y~~) have no text equivalent and are assigned to the group
 * of the text word that follows them. Deleted words appearing AFTER the last
 * text word are assigned to the sentinel position `mapping[textWords.length]`
 * so they can be included in slices that extend to the end of the line.
 */
export function buildTextToMdMapping(
  textWords: string[],
  mdWords: string[],
): number[] {
  const mapping = new Array(textWords.length + 1).fill(mdWords.length);
  let mdIdx = 0;
  let inDeleted = false;
  for (let ti = 0; ti <= textWords.length; ti++) {
    mapping[ti] = mdIdx;
    if (ti < textWords.length) {
      while (mdIdx < mdWords.length) {
        const w = mdWords[mdIdx];
        if (inDeleted) {
          mdIdx++;
          if (w.endsWith("~~")) inDeleted = false;
        } else if (w.startsWith("~~")) {
          inDeleted = !(w.endsWith("~~") && w.length > 4);
          mdIdx++;
        } else {
          break;
        }
      }
      if (mdIdx < mdWords.length) mdIdx++;
    }
  }
  // mapping[textWords.length] was set to mdIdx-after-last-text-word above.
  // Anything past that in mdWords is trailing deleted markdown — extend the
  // sentinel through it so slices ending at the line's last text word still
  // pick up trailing strikeouts.
  mapping[textWords.length] = mdWords.length;
  return mapping;
}
