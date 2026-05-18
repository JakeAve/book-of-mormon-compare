import { initWasm, Resvg } from "@resvg/resvg-wasm";
import { define } from "@/utils/state.ts";
import { buildOgImageSvg } from "@/lib/ogImage.ts";
import { isBookAbbr } from "@/lib/data.ts";

const KNOWN_VERSIONS = new Set(["om", "pm", "1830", "1837", "2013"]);

let wasmInit: Promise<void> | null = null;

function ensureWasm(): Promise<void> {
  if (!wasmInit) {
    const wasmPath = new URL(
      "../node_modules/@resvg/resvg-wasm/index_bg.wasm",
      import.meta.url,
    );
    wasmInit = initWasm(Deno.readFile(wasmPath));
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

      await ensureWasm();

      const svg = buildOgImageSvg({ book, chapter, v1, v2 });
      const resvg = new Resvg(svg, { font: { loadSystemFonts: false } });
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
