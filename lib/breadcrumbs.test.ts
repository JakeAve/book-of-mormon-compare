import { assertEquals } from "@std/assert";
import { buildBreadcrumbList } from "./breadcrumbs.ts";

Deno.test("buildBreadcrumbList builds a positioned schema.org list", () => {
  const result = buildBreadcrumbList([
    { name: "Home", url: "https://example.com/" },
    { name: "About", url: "https://example.com/about" },
  ]);

  assertEquals(result, {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": "https://example.com/",
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "About",
        "item": "https://example.com/about",
      },
    ],
  });
});
