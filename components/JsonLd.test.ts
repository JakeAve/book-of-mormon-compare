import { assertEquals } from "@std/assert";
import { render } from "preact-render-to-string";
import { JsonLd } from "./JsonLd.tsx";

function extractLdJson(html: string): string[] {
  const blocks: string[] = [];
  const re = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g;
  for (const match of html.matchAll(re)) {
    blocks.push(match[1]);
  }
  return blocks;
}

Deno.test("JsonLd renders parseable JSON for a plain object", () => {
  const data = { "@context": "https://schema.org", "@type": "Thing" };
  const html = render(JsonLd({ data }));
  const [block] = extractLdJson(html);
  assertEquals(JSON.parse(block), data);
});

Deno.test("JsonLd escapes a literal < so it round-trips through JSON.parse", () => {
  const data = { description: "a < b" };
  const html = render(JsonLd({ data }));
  const [block] = extractLdJson(html);
  assertEquals(JSON.parse(block), data);
});

Deno.test("JsonLd escapes a literal </script> so the block cannot be terminated early", () => {
  const data = { description: "</script><script>alert(1)</script>" };
  const html = render(JsonLd({ data }));
  const blocks = extractLdJson(html);
  assertEquals(blocks.length, 1);
  assertEquals(JSON.parse(blocks[0]), data);
});
