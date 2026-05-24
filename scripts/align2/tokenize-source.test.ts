import { assertEquals } from "@std/assert";
import { tokenizeSource } from "./tokenize-source.ts";
import { join } from "jsr:@std/path@1";

async function withFixture(
  pages: Record<string, unknown[]>,
  fn: (dir: string) => Promise<void>,
): Promise<void> {
  const dir = await Deno.makeTempDir();
  try {
    for (const [name, data] of Object.entries(pages)) {
      await Deno.writeTextFile(join(dir, name), JSON.stringify(data));
    }
    await fn(dir);
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
}

Deno.test("tokenizeSource: produces words in page/line order", async () => {
  await withFixture({
    "1.json": [
      {
        text: "I Nephi",
        markdown: "I Nephi",
        chapter: 1,
        verse: 1,
        source: "url1",
      },
    ],
  }, async (dir) => {
    const { words } = await tokenizeSource(dir);
    assertEquals(words.length, 2);
    assertEquals(words[0].norm, "i");
    assertEquals(words[0].raw, "I");
    assertEquals(words[0].page, 1);
    assertEquals(words[0].line, 1);
    assertEquals(words[0].wordIndexInLine, 0);
    assertEquals(words[1].norm, "nephi");
    assertEquals(words[1].wordIndexInLine, 1);
  });
});

Deno.test("tokenizeSource: normalizes & to and", async () => {
  await withFixture({
    "1.json": [{ text: "Lehi & Sariah", chapter: 1, verse: 1 }],
  }, async (dir) => {
    const { words } = await tokenizeSource(dir);
    assertEquals(words[1].norm, "and");
    assertEquals(words[1].raw, "&");
  });
});

Deno.test("tokenizeSource: pages loaded in numeric order", async () => {
  await withFixture({
    "2.json": [{ text: "second", chapter: 2, verse: 1 }],
    "10.json": [{ text: "tenth", chapter: 10, verse: 1 }],
    "1.json": [{ text: "first", chapter: 1, verse: 1 }],
  }, async (dir) => {
    const { words } = await tokenizeSource(dir);
    assertEquals(words.map((w) => w.norm), ["first", "second", "tenth"]);
  });
});

Deno.test("tokenizeSource: LineInfo map contains full text and markdown", async () => {
  await withFixture({
    "1.json": [
      {
        text: "rney into",
        markdown: "rney ~~un~~ into",
        chapter: 5,
        verse: 6,
        source: "url",
      },
    ],
  }, async (dir) => {
    const { lines } = await tokenizeSource(dir);
    const info = lines.get("5:6");
    assertEquals(info?.text, "rney into");
    assertEquals(info?.markdown, "rney ~~un~~ into");
    assertEquals(info?.source, "url");
  });
});

Deno.test("tokenizeSource: LineInfo markdown omitted when same as text", async () => {
  await withFixture({
    "1.json": [{ text: "I Nephi", markdown: "I Nephi", chapter: 1, verse: 1 }],
  }, async (dir) => {
    const { lines } = await tokenizeSource(dir);
    assertEquals(lines.get("1:1")?.markdown, undefined);
  });
});

Deno.test("tokenizeSource: skips punctuation-only tokens from norm", async () => {
  await withFixture({
    "1.json": [{ text: "end— start", chapter: 1, verse: 1 }],
  }, async (dir) => {
    const { words } = await tokenizeSource(dir);
    assertEquals(words.map((w) => w.norm), ["end", "start"]);
  });
});
