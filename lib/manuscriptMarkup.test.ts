import { assertEquals } from "@std/assert";
import {
  parseManuscriptMarkup,
  stripManuscriptMarkup,
} from "./manuscriptMarkup.ts";
import { splitText } from "./textHelpers.ts";

// --- stripManuscriptMarkup ---

Deno.test("strip: removes ~~ markers", () => {
  assertEquals(stripManuscriptMarkup("~~word~~"), "word");
});

Deno.test("strip: removes {{ }} markers", () => {
  assertEquals(stripManuscriptMarkup("{{unclear}}"), "unclear");
});

Deno.test("strip: removes [ ] markers", () => {
  assertEquals(stripManuscriptMarkup("dow[n]"), "down");
});

Deno.test("strip: leaves plain text unchanged", () => {
  assertEquals(stripManuscriptMarkup("normal text"), "normal text");
});

Deno.test("strip: handles mixed markers", () => {
  assertEquals(
    stripManuscriptMarkup("fore to proseed with mine ~~c~~ acount"),
    "fore to proseed with mine c acount",
  );
});

// --- parseManuscriptMarkup ---

Deno.test("parse: plain text → all normal tokens", () => {
  const result = parseManuscriptMarkup("hello world");
  assertEquals(result.length, 2);
  assertEquals(result[0].text, "hello");
  assertEquals(result[0].kind, "normal");
  assertEquals(result[0].segments, undefined);
  assertEquals(result[1].text, "world");
  assertEquals(result[1].kind, "normal");
  assertEquals(result[1].segments, undefined);
});

Deno.test("parse: ~~word~~ → deleted", () => {
  const result = parseManuscriptMarkup("~~word~~");
  assertEquals(result.length, 1);
  assertEquals(result[0].text, "word");
  assertEquals(result[0].kind, "deleted");
  assertEquals(result[0].segments, undefined);
});

Deno.test("parse: {{word}} → unclear", () => {
  const result = parseManuscriptMarkup("{{word}}");
  assertEquals(result.length, 1);
  assertEquals(result[0].text, "word");
  assertEquals(result[0].kind, "unclear");
  assertEquals(result[0].segments, undefined);
});

Deno.test("parse: [word] → inserted", () => {
  const result = parseManuscriptMarkup("[word]");
  assertEquals(result.length, 1);
  assertEquals(result[0].text, "word");
  assertEquals(result[0].kind, "inserted");
  assertEquals(result[0].segments, undefined);
});

Deno.test("parse: dow[n] → token with inserted dominant and segments", () => {
  const result = parseManuscriptMarkup("dow[n]");
  assertEquals(result.length, 1);
  assertEquals(result[0].text, "down");
  assertEquals(result[0].kind, "inserted");
  assertEquals(result[0].segments, [
    { text: "dow", kind: "normal" },
    { text: "n", kind: "inserted" },
  ]);
});

Deno.test("parse: {{h}}e → unclear wins over normal in same word, with segments", () => {
  const result = parseManuscriptMarkup("{{h}}e");
  assertEquals(result.length, 1);
  assertEquals(result[0].text, "he");
  assertEquals(result[0].kind, "unclear");
  assertEquals(result[0].segments, [
    { text: "h", kind: "unclear" },
    { text: "e", kind: "normal" },
  ]);
});

Deno.test("parse: mountain~~s~~ → normal word with deleted suffix via segments", () => {
  const result = parseManuscriptMarkup("mountain~~s~~");
  assertEquals(result.length, 1);
  assertEquals(result[0].text, "mountains");
  assertEquals(result[0].kind, "deleted");
  assertEquals(result[0].segments, [
    { text: "mountain", kind: "normal" },
    { text: "s", kind: "deleted" },
  ]);
});

Deno.test("parse: cross-word unclear markup {{& it ca}}", () => {
  const result = parseManuscriptMarkup("{{& it ca}}");
  assertEquals(result.length, 3);
  assertEquals(result[0].kind, "unclear");
  assertEquals(result[1].kind, "unclear");
  assertEquals(result[2].kind, "unclear");
  assertEquals(result[0].text, "&");
  assertEquals(result[1].text, "it");
  assertEquals(result[2].text, "ca");
});

Deno.test("parse: mixed sentence with inline deleted word", () => {
  const result = parseManuscriptMarkup(
    "fore to proseed with mine ~~c~~ acount",
  );
  const deleted = result.filter((t) => t.kind === "deleted");
  assertEquals(deleted.length, 1);
  assertEquals(deleted[0].text, "c");
  const normal = result.filter((t) => t.kind === "normal");
  assertEquals(normal.length > 0, true);
});

Deno.test("parse: deleted priority over unclear", () => {
  // ~~{{mixed}}~~ — deleted wraps unclear: deleted wins
  const result = parseManuscriptMarkup("~~{{mixed}}~~");
  assertEquals(result.length, 1);
  assertEquals(result[0].kind, "deleted");
});

Deno.test("parse: empty string → empty array", () => {
  assertEquals(parseManuscriptMarkup(""), []);
});

Deno.test("parse: token count matches splitText of stripped", () => {
  const markdown = "fore to proseed with mine ~~c~~ acount i must speak";
  const result = parseManuscriptMarkup(markdown);
  const strippedTokens = splitText(stripManuscriptMarkup(markdown));
  assertEquals(result.length, strippedTokens.length);
  assertEquals(result.map((t) => t.text), strippedTokens);
});

Deno.test("parse: unclosed ~~ marker applies kind to rest of string", () => {
  const result = parseManuscriptMarkup("~~word");
  assertEquals(result.length, 1);
  assertEquals(result[0].text, "word");
  assertEquals(result[0].kind, "deleted");
  assertEquals(result[0].segments, undefined);
});

// The Joseph Smith Papers transcripts carry insertions in two notations:
// [inserted] and <inserted>, the latter padded with zero-width spaces. They
// mean the same thing — 1 Nephi 22:29 uses both in a single verse.
Deno.test("stripManuscriptMarkup: drops caret insertion markers", () => {
  assertEquals(
    stripManuscriptMarkup("for thy ~~thy~~ <​my name​> name sake"),
    "for thy thy my name name sake",
  );
});

Deno.test("stripManuscriptMarkup: drops zero-width padding inside a word", () => {
  assertEquals(stripManuscriptMarkup("as ~~ye<​t​>~~ [yet]"), "as yet yet");
});

Deno.test("parseManuscriptMarkup: caret content is inserted, like brackets", () => {
  const bracket = parseManuscriptMarkup("unto [all] nations");
  const caret = parseManuscriptMarkup("unto <​all​> nations");
  assertEquals(
    caret.map((t) => [t.text, t.kind]),
    bracket.map((t) => [t.text, t.kind]),
  );
  assertEquals(caret[1].kind, "inserted");
});

Deno.test("parseManuscriptMarkup: a caret nested in a deletion stays deleted", () => {
  const tokens = parseManuscriptMarkup("the bottom ~~<​thereof​>~~ thereof");
  assertEquals(tokens.find((t) => t.text === "thereof")?.kind, "deleted");
});

Deno.test("parseManuscriptMarkup: an unclosed caret does not swallow the rest", () => {
  const tokens = parseManuscriptMarkup("smiten <​him them by the hand");
  assertEquals(
    tokens.map((t) => t.text).join(" "),
    "smiten him them by the hand",
  );
});
