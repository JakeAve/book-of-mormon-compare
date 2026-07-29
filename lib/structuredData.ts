const SITE_NAME = "Book of Mormon Compare";

export function buildOrganization(siteUrl: string): Record<string, unknown> {
  return {
    "@type": "Organization",
    "name": SITE_NAME,
    "url": `${siteUrl}/`,
    "logo": `${siteUrl}/logo.svg`,
  };
}

export function buildWebApplication(siteUrl: string): Record<string, unknown> {
  return {
    "@type": "WebApplication",
    "name": SITE_NAME,
    "url": `${siteUrl}/`,
    "applicationCategory": "ReferenceApplication",
    "operatingSystem": "Any",
    "description":
      "Side-by-side word-level comparison of Book of Mormon manuscripts and printed editions.",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD",
    },
  };
}

export function buildDataset(
  input: { siteUrl: string; versionCount: number; chapterCount: number },
): Record<string, unknown> {
  return {
    "@type": "Dataset",
    "name": "Book of Mormon textual witnesses",
    "url": `${input.siteUrl}/versions`,
    "description":
      `Verse-level transcriptions of ${input.versionCount} Book of Mormon witnesses across ${input.chapterCount} chapters, aligned for side-by-side comparison.`,
    "creator": buildOrganization(input.siteUrl),
    "isAccessibleForFree": true,
  };
}

export function buildArticle(
  input: {
    headline: string;
    description: string;
    url: string;
    siteUrl: string;
  },
): Record<string, unknown> {
  return {
    "@type": "Article",
    "headline": input.headline,
    "description": input.description,
    "mainEntityOfPage": input.url,
    "publisher": buildOrganization(input.siteUrl),
  };
}

export function buildCollectionPage(
  input: { name: string; description: string; url: string },
): Record<string, unknown> {
  return {
    "@type": "CollectionPage",
    "name": input.name,
    "description": input.description,
    "url": input.url,
  };
}
