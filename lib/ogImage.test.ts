import { assertEquals, assertStringIncludes } from "@std/assert";
import { buildOgImageSvg } from "./ogImage.ts";

Deno.test("buildOgImageSvg returns valid SVG string", () => {
  const svg = buildOgImageSvg({
    book: "1-ne",
    chapter: "3",
    v1: "pm",
    v2: "2013",
  });
  assertStringIncludes(svg, "<svg");
  assertStringIncludes(svg, "</svg>");
  assertStringIncludes(svg, 'width="1200"');
  assertStringIncludes(svg, 'height="630"');
});

Deno.test("buildOgImageSvg includes book display name", () => {
  const svg = buildOgImageSvg({
    book: "1-ne",
    chapter: "3",
    v1: "pm",
    v2: "2013",
  });
  assertStringIncludes(svg, "1 Nephi");
});

Deno.test("buildOgImageSvg includes chapter number", () => {
  const svg = buildOgImageSvg({
    book: "1-ne",
    chapter: "3",
    v1: "pm",
    v2: "2013",
  });
  assertStringIncludes(svg, "Chapter 3");
});

Deno.test("buildOgImageSvg includes short version names", () => {
  const svg = buildOgImageSvg({
    book: "1-ne",
    chapter: "3",
    v1: "pm",
    v2: "2013",
  });
  assertStringIncludes(svg, "Printer&#39;s Manuscript");
  assertStringIncludes(svg, "2013 Edition");
});

Deno.test("buildOgImageSvg escapes XML in unknown version", () => {
  const svg = buildOgImageSvg({
    book: "1-ne",
    chapter: "1",
    v1: "<evil>",
    v2: "2013",
  });
  assertEquals(svg.includes("<evil>"), false);
  assertStringIncludes(svg, "&lt;evil&gt;");
});

Deno.test("buildOgImageSvg omits chapter for title-page", () => {
  const svg = buildOgImageSvg({
    book: "title-page",
    chapter: "1",
    v1: "pm",
    v2: "2013",
  });
  assertEquals(svg.includes("Chapter"), false);
  assertStringIncludes(svg, "Title Page");
});

Deno.test("buildOgImageSvg omits chapter for witnesses", () => {
  const svg = buildOgImageSvg({
    book: "witnesses",
    chapter: "1",
    v1: "pm",
    v2: "2013",
  });
  assertEquals(svg.includes("Chapter"), false);
  assertStringIncludes(svg, "Witness");
});

Deno.test("buildOgImageSvg handles unknown book gracefully", () => {
  const svg = buildOgImageSvg({
    book: "unknown-book",
    chapter: "1",
    v1: "pm",
    v2: "2013",
  });
  assertStringIncludes(svg, "unknown-book");
});
