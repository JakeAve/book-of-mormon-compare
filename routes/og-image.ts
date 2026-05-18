import { initWasm, Resvg } from "@resvg/resvg-wasm";
import { define } from "@/utils/state.ts";
import { buildOgImageSvg } from "@/lib/ogImage.ts";
import { isBookAbbr, VERSION_DISPLAY_NAMES } from "@/lib/data.ts";
import { getCormorantGaramondBytes } from "@/lib/fontData.ts";

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
      const chapter = searchParams.get("chapter") ?? "";
      const rawV1 = searchParams.get("v1") ?? "";
      const rawV2 = searchParams.get("v2") ?? "";
      const v1 = KNOWN_VERSIONS.has(rawV1) ? rawV1 : "";
      const v2 = KNOWN_VERSIONS.has(rawV2) ? rawV2 : "";

      const [fontBytes] = await Promise.all([
        Promise.resolve(getCormorantGaramondBytes()),
        ensureWasm(),
      ]);

      const svg = buildOgImageSvg({ book, chapter, v1, v2 });
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
