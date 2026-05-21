#!/usr/bin/env -S deno run -A
import { initWasm, Resvg } from "@resvg/resvg-wasm";

const RESVG_WASM_URL =
  "https://cdn.jsdelivr.net/npm/@resvg/resvg-wasm@2.6.2/index_bg.wasm";

await fetch(RESVG_WASM_URL).then((res) => initWasm(res));

const fontData = await Deno.readFile(
  new URL("../static/CormorantGaramond-Regular.ttf", import.meta.url),
);

const svgRaw = await Deno.readTextFile(
  new URL("../static/logo.svg", import.meta.url),
);

// Substitute the font family so resvg resolves it against the loaded font
const svgText = svgRaw.replace(
  /font-family="[^"]*"/,
  'font-family="Cormorant Garamond"',
);

const fontOpts = {
  fontBuffers: [fontData],
  defaultFontFamily: "Cormorant Garamond",
};

function renderPng(size: number): Uint8Array {
  const resvg = new Resvg(svgText, {
    fitTo: { mode: "width", value: size },
    font: fontOpts,
  });
  return resvg.render().asPng();
}

function renderMaskable(size: number): Uint8Array {
  // Safe zone: inner 80% of canvas. Pad 10% on each side.
  const innerSize = Math.round(size * 0.8);
  const padding = Math.round(size * 0.1);
  const innerPng = renderPng(innerSize);
  const b64 = btoa(String.fromCharCode(...innerPng));

  const wrapper =
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="#f4f0e8"/>
  <image href="data:image/png;base64,${b64}" x="${padding}" y="${padding}" width="${innerSize}" height="${innerSize}"/>
</svg>`;
  const resvgWrapper = new Resvg(wrapper, {
    fitTo: { mode: "width", value: size },
  });
  return resvgWrapper.render().asPng();
}

await Deno.mkdir(new URL("../static/icons", import.meta.url), {
  recursive: true,
});

await Deno.writeFile(
  new URL("../static/icons/icon-192.png", import.meta.url),
  renderPng(192),
);
console.log("✓ icon-192.png");

await Deno.writeFile(
  new URL("../static/icons/icon-512.png", import.meta.url),
  renderPng(512),
);
console.log("✓ icon-512.png");

await Deno.writeFile(
  new URL("../static/icons/icon-512-maskable.png", import.meta.url),
  renderMaskable(512),
);
console.log("✓ icon-512-maskable.png");

await Deno.writeFile(
  new URL("../static/apple-touch-icon.png", import.meta.url),
  renderPng(180),
);
console.log("✓ apple-touch-icon.png");
