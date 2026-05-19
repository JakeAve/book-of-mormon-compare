import { initWasm, Resvg } from "@resvg/resvg-wasm";
import { define } from "@/utils/state.ts";
import { buildOgImageSvg, buildVersePreviewText } from "@/lib/ogImage.ts";
import { isBookAbbr, loadChapter, VERSION_DISPLAY_NAMES } from "@/lib/data.ts";
import { getCormorantGaramondBytes } from "@/lib/fontData.ts";
import { parseMarkParam } from "@/lib/verseMark.ts";

const KNOWN_VERSIONS = new Set(Object.keys(VERSION_DISPLAY_NAMES));

const RESVG_WASM_URL =
  "https://cdn.jsdelivr.net/npm/@resvg/resvg-wasm@2.6.2/index_bg.wasm";

let wasmInit: Promise<void> | null = null;

function ensureWasm(): Promise<void> {
  if (!wasmInit) {
    wasmInit = fetch(RESVG_WASM_URL)
      .then((res) => initWasm(res))
      .catch((e) => {
        if (
          !(e instanceof Error) || !e.message.includes("Already initialized")
        ) {
          throw e;
        }
      });
  }
  return wasmInit;
}

export const handler = define.handlers({
  async GET(ctx) {
    try {
      const { searchParams } = ctx.url;
      const rawBook = searchParams.get("book") ?? "";
      const book = isBookAbbr(rawBook) ? rawBook : "";
      const rawChapter = searchParams.get("chapter") ?? "";
      const chapterNum = parseInt(rawChapter, 10);
      const chapter = Number.isInteger(chapterNum) && chapterNum > 0
        ? String(chapterNum)
        : "";
      const rawV1 = searchParams.get("v1") ?? "";
      const rawV2 = searchParams.get("v2") ?? "";
      const v1 = KNOWN_VERSIONS.has(rawV1) ? rawV1 : "";
      const v2 = KNOWN_VERSIONS.has(rawV2) ? rawV2 : "";
      const marks = parseMarkParam(searchParams.get("mark"));

      const [fontBytes] = await Promise.all([
        Promise.resolve(getCormorantGaramondBytes()),
        ensureWasm(),
      ]);

      let verseNumber: number | undefined;
      let verse1Text: string | undefined;
      let verse2Text: string | undefined;
      let inlineVerseNums: number[] | undefined;

      if (marks && marks.size > 0 && book && chapter && v1 && v2) {
        const sorted = [...marks].sort((a, b) => a - b);
        const [verses1, verses2] = await Promise.all([
          loadChapter(v1, book, chapter),
          loadChapter(v2, book, chapter),
        ]);
        const t1 = buildVersePreviewText(verses1, marks);
        const t2 = buildVersePreviewText(verses2, marks);
        if (t1 && t2) {
          verseNumber = sorted[0];
          verse1Text = t1;
          verse2Text = t2;
          inlineVerseNums = sorted.slice(1);
        }
      }

      const svg = buildOgImageSvg({
        book,
        chapter,
        v1,
        v2,
        verseNumber,
        verse1Text,
        verse2Text,
        inlineVerseNums,
      });
      const resvg = new Resvg(svg, {
        font: {
          fontBuffers: [fontBytes],
          defaultFontFamily: "Cormorant Garamond",
        },
      });
      const png = resvg.render().asPng() as BodyInit;

      return new Response(png, {
        headers: {
          "Content-Type": "image/png",
          "Cache-Control": "public, max-age=86400",
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return new Response(`Internal Server Error: ${message}`, { status: 500 });
    }
  },
});
