import { assertEquals } from "@std/assert";
import { groupCachedNavigations } from "./cachedNavigations.ts";

Deno.test("groups chapter URLs by version pair, sorted by book then chapter", () => {
  const urls = [
    "https://x.test/2-ne/3?v1=om&v2=2013",
    "https://x.test/1-ne/2?v1=om&v2=2013",
    "https://x.test/1-ne/1?v1=om&v2=2013",
    "https://x.test/1-ne/1?v1=pm&v2=1830",
  ];
  const groups = groupCachedNavigations(urls);
  assertEquals(groups.length, 2);

  const omTo2013 = groups.find((g) => g.v1 === "om" && g.v2 === "2013")!;
  assertEquals(omTo2013.entries.map((e) => `${e.book}/${e.chapter}`), [
    "1-ne/1",
    "1-ne/2",
    "2-ne/3",
  ]);

  const pmTo1830 = groups.find((g) => g.v1 === "pm" && g.v2 === "1830")!;
  assertEquals(pmTo1830.entries.length, 1);
});

Deno.test("skips non-chapter URLs", () => {
  const urls = [
    "https://x.test/about",
    "https://x.test/",
    "https://x.test/sitemap.xml",
    "https://x.test/1-ne/1?v1=om&v2=2013",
  ];
  const groups = groupCachedNavigations(urls);
  assertEquals(groups.length, 1);
  assertEquals(groups[0].entries.length, 1);
});

Deno.test("skips chapter URLs missing v1 or v2", () => {
  const urls = [
    "https://x.test/1-ne/1",
    "https://x.test/1-ne/1?v1=om",
    "https://x.test/1-ne/1?v2=2013",
    "https://x.test/1-ne/1?v1=om&v2=2013",
  ];
  const groups = groupCachedNavigations(urls);
  assertEquals(groups.length, 1);
  assertEquals(groups[0].entries.length, 1);
});

Deno.test("skips URLs whose book is not in BOOK_ORDER", () => {
  const urls = [
    "https://x.test/not-a-book/1?v1=om&v2=2013",
    "https://x.test/1-ne/1?v1=om&v2=2013",
  ];
  const groups = groupCachedNavigations(urls);
  assertEquals(groups.length, 1);
  assertEquals(groups[0].entries[0].book, "1-ne");
});

Deno.test("preserves original href on each entry", () => {
  const href = "https://x.test/1-ne/1?v1=om&v2=2013";
  const groups = groupCachedNavigations([href]);
  assertEquals(groups[0].entries[0].href, "/1-ne/1?v1=om&v2=2013");
});

Deno.test("returns empty array for no matches", () => {
  assertEquals(groupCachedNavigations([]), []);
  assertEquals(
    groupCachedNavigations(["https://x.test/about"]),
    [],
  );
});
