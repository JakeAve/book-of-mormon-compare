import { assertEquals } from "@std/assert";
import { buildTextToMdMapping } from "./markdown.ts";

Deno.test("buildTextToMdMapping: no markdown differences", () => {
  const textWords = ["he", "said"];
  const mdWords = ["he", "said"];
  assertEquals(buildTextToMdMapping(textWords, mdWords), [0, 1, 2]);
});

Deno.test("buildTextToMdMapping: deleted word before text word is included with it", () => {
  // markdown: ~~bor~~ born → text: born
  // mapping[0]=0 so slice [0..2] = ["~~bor~~","born"] — deletion included with "born"
  const textWords = ["born"];
  const mdWords = ["~~bor~~", "born"];
  assertEquals(buildTextToMdMapping(textWords, mdWords), [0, 2]);
});

Deno.test("buildTextToMdMapping: deleted word between text words is included with following word", () => {
  // markdown: I ~~Nephi~~ having → text: I having
  // slice for "having" = mdWords[1..3] = ["~~Nephi~~","having"] — deletion included
  const textWords = ["I", "having"];
  const mdWords = ["I", "~~Nephi~~", "having"];
  assertEquals(buildTextToMdMapping(textWords, mdWords), [0, 1, 3]);
});

Deno.test("buildTextToMdMapping: multi-word deletion included with following word", () => {
  // markdown: ~~un into~~ the → text: the
  // mapping[0]=0 so slice [0..3] = ["~~un","into~~","the"] — deletion included
  const textWords = ["the"];
  const mdWords = ["~~un", "into~~", "the"];
  assertEquals(buildTextToMdMapping(textWords, mdWords), [0, 3]);
});

Deno.test("buildTextToMdMapping: trailing deletion is included with last text word", () => {
  // markdown: the ~~d~~ → text: the
  // slice for "the" (maxIdx=0) = mdWords[0..mapping[1]] should include ~~d~~.
  const textWords = ["the"];
  const mdWords = ["the", "~~d~~"];
  assertEquals(buildTextToMdMapping(textWords, mdWords), [0, 2]);
});

Deno.test("buildTextToMdMapping: trailing multi-word deletion is included", () => {
  // markdown: had ~~to fall in their~~ → text: had
  const textWords = ["had"];
  const mdWords = ["had", "~~to", "fall", "in", "their~~"];
  assertEquals(buildTextToMdMapping(textWords, mdWords), [0, 5]);
});
