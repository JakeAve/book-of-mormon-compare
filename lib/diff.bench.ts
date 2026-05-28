import { diff, diffVersesPaired } from "./diff.ts";
import { loadChapter } from "./data.ts";
import { stripManuscriptMarkup } from "./manuscriptMarkup.ts";

const verses2013 = await loadChapter("2013", "alma", "13");
const verses1830 = await loadChapter("1830", "alma", "13");
const versesPm = await loadChapter("pm", "alma", "13");
const versesOm = await loadChapter("om", "alma", "13");

const texts2013 = verses2013.map((v) =>
  stripManuscriptMarkup(v.markdown ?? v.text)
);
const texts1830 = verses1830.map((v) =>
  stripManuscriptMarkup(v.markdown ?? v.text)
);
const textsPm = versesPm.map((v) =>
  stripManuscriptMarkup(v.markdown ?? v.text)
);
const textsOm = versesOm.map((v) =>
  stripManuscriptMarkup(v.markdown ?? v.text)
);

Deno.bench("whole-chapter diff: 2013 vs 1830 (Alma 13)", () => {
  diff(texts2013.join("\n"), texts1830.join("\n"));
});

Deno.bench("per-verse diff: 2013 vs 1830 (Alma 13)", () => {
  diffVersesPaired(texts2013, texts1830);
});

Deno.bench("whole-chapter diff: 2013 vs PM (Alma 13)", () => {
  diff(texts2013.join("\n"), textsPm.join("\n"));
});

Deno.bench("per-verse diff: 2013 vs PM (Alma 13)", () => {
  diffVersesPaired(texts2013, textsPm);
});

Deno.bench("whole-chapter diff: 2013 vs OM (Alma 13)", () => {
  diff(texts2013.join("\n"), textsOm.join("\n"));
});

Deno.bench("per-verse diff: 2013 vs OM (Alma 13)", () => {
  diffVersesPaired(texts2013, textsOm);
});
