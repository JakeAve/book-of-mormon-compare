const SITE_NAME = "Book of Mormon Compare";

export function buildOrganization(siteUrl: string): Record<string, unknown> {
  return {
    "@type": "Organization",
    "name": SITE_NAME,
    "url": `${siteUrl}/`,
    "logo": `${siteUrl}/logo.svg`,
  };
}

// Google flags missing aggregateRating/review here as non-critical issues.
// Both stay omitted on purpose: the site has no ratings or reviews, and
// structured data must reflect content actually on the page. Supplying them
// would be fabricated data and a manual-action risk. The trade is that the
// Software App rich result (the star-rating card) will never render.
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

// license, identifier and distribution are recommended by Google and stay
// omitted: the scriptural text belongs to its respective publishers so this
// project cannot assert a license over it, there is no DOI, and no downloadable
// distribution is offered. Their absence is a non-critical issue by design.
export function buildDataset(
  input: { siteUrl: string; versionCount: number; chapterCount: number },
): Record<string, unknown> {
  return {
    "@type": "Dataset",
    "name": "Book of Mormon textual witnesses",
    "url": `${input.siteUrl}/versions`,
    "description":
      `Verse-level transcriptions of ${input.versionCount} Book of Mormon witnesses spanning up to ${input.chapterCount} chapters, aligned for side-by-side comparison.`,
    "creator": buildOrganization(input.siteUrl),
    "isAccessibleForFree": true,
    // Dictation of the Original Manuscript through the current edition.
    "temporalCoverage": "1829/2013",
    "keywords": [
      "Book of Mormon",
      "textual criticism",
      "manuscript transcription",
      "critical text",
      "textual variants",
    ],
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
