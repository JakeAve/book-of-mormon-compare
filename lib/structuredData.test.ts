import { assertEquals } from "@std/assert";
import {
  buildArticle,
  buildCollectionPage,
  buildDataset,
  buildOrganization,
  buildWebApplication,
} from "./structuredData.ts";

const SITE = "https://example.com";

Deno.test("buildOrganization names the site and its url", () => {
  assertEquals(buildOrganization(SITE), {
    "@type": "Organization",
    "name": "Book of Mormon Compare",
    "url": `${SITE}/`,
    "logo": `${SITE}/logo.svg`,
  });
});

Deno.test("buildWebApplication declares a free reference application", () => {
  const result = buildWebApplication(SITE);
  assertEquals(result["@type"], "WebApplication");
  assertEquals(result["applicationCategory"], "ReferenceApplication");
  assertEquals(result["url"], `${SITE}/`);
  assertEquals(result["offers"], {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD",
  });
});

Deno.test("buildDataset reports the corpus size", () => {
  const result = buildDataset({
    siteUrl: SITE,
    versionCount: 7,
    chapterCount: 241,
  });
  assertEquals(result["@type"], "Dataset");
  assertEquals(result["url"], `${SITE}/versions`);
  assertEquals(
    result["description"],
    "Verse-level transcriptions of 7 Book of Mormon witnesses spanning up to 241 chapters, aligned for side-by-side comparison.",
  );
  assertEquals(result["temporalCoverage"], "1829/2013");
  assertEquals(Array.isArray(result["keywords"]), true);
});

Deno.test("buildDataset asserts no license it does not hold", () => {
  const result = buildDataset({
    siteUrl: SITE,
    versionCount: 7,
    chapterCount: 241,
  });
  for (const field of ["license", "identifier", "distribution"]) {
    assertEquals(
      field in result,
      false,
      `${field} is deliberately omitted — see the comment on buildDataset`,
    );
  }
});

Deno.test("buildWebApplication fabricates no ratings or reviews", () => {
  const result = buildWebApplication(SITE);
  for (const field of ["aggregateRating", "review", "reviewCount"]) {
    assertEquals(
      field in result,
      false,
      `${field} must stay absent — the site has no ratings to report`,
    );
  }
});

Deno.test("buildArticle carries headline, description and publisher", () => {
  const result = buildArticle({
    headline: "Textual Criticism",
    description: "How witnesses are compared.",
    url: `${SITE}/textual-criticism`,
    siteUrl: SITE,
  });
  assertEquals(result["@type"], "Article");
  assertEquals(result["headline"], "Textual Criticism");
  assertEquals(result["mainEntityOfPage"], `${SITE}/textual-criticism`);
  assertEquals(
    (result["publisher"] as Record<string, unknown>)["name"],
    "Book of Mormon Compare",
  );
});

Deno.test("buildCollectionPage carries name, description and url", () => {
  assertEquals(
    buildCollectionPage({
      name: "Alma",
      description: "Alma carries 900 textual variants.",
      url: `${SITE}/alma`,
    }),
    {
      "@type": "CollectionPage",
      "name": "Alma",
      "description": "Alma carries 900 textual variants.",
      "url": `${SITE}/alma`,
    },
  );
});
