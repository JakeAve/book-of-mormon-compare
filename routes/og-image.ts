import { initWasm, Resvg } from "@resvg/resvg-wasm";
import { define } from "@/utils/state.ts";
import { buildOgImageSvg } from "@/lib/ogImage.ts";

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
    const { searchParams } = ctx.url;
    const book = searchParams.get("book") ?? "";
    const chapter = searchParams.get("chapter") ?? "";
    const v1 = searchParams.get("v1") ?? "";
    const v2 = searchParams.get("v2") ?? "";

    await ensureWasm();

    const svg = buildOgImageSvg({ book, chapter, v1, v2 });
    const resvg = new Resvg(svg, { font: { loadSystemFonts: false } });
    const png = resvg.render().asPng() as unknown as BodyInit;

    return new Response(png, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400",
      },
    });
  },
});
