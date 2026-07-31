import { VERSION_DISPLAY_NAMES, VERSION_SHORT_NAMES } from "./data.ts";

export interface VersionInfo {
  key: string;
  name: string;
  shortName: string;
  summary: string;
  compareHref: string;
}

function info(
  key: string,
  summary: string,
  compareHref: string,
): VersionInfo {
  return {
    key,
    name: VERSION_DISPLAY_NAMES[key],
    shortName: VERSION_SHORT_NAMES[key],
    summary,
    compareHref,
  };
}

export const VERSION_INFO: Record<string, VersionInfo> = {
  "om": info(
    "om",
    "Dictated in 1829 to Oliver Cowdery and other scribes. The closest surviving witness to the dictation text; roughly 28% of its pages are extant.",
    "/1-ne/1?v1=om&v2=2013",
  ),
  "pm": info(
    "pm",
    "Copied from the Original Manuscript by Oliver Cowdery in 1829-1830 and used as the compositor's copy for the 1830 edition. Nearly 100% extant.",
    "/1-ne/1?v1=pm&v2=2013",
  ),
  "1830": info(
    "1830",
    "Published by E.B. Grandin in Palmyra, New York. No versification; the text runs in large narrative chapters, with a fresh layer of compositor variation.",
    "/1-ne/1?v1=1830&v2=2013",
  ),
  "1837": info(
    "1837",
    "Published in Kirtland, Ohio, with roughly 3,000 emendations supervised by Joseph Smith, the large majority of them grammatical and syntactic.",
    "/1-ne/1?v1=1837&v2=2013",
  ),
  "1840": info(
    "1840",
    "Printed in Cincinnati under Ebenezer Robinson. Joseph Smith compared it against the Original Manuscript, restoring readings lost in earlier copying.",
    "/1-ne/1?v1=1840&v2=2013",
  ),
  "1841": info(
    "1841",
    "The first edition published outside the United States, typeset in Liverpool from an 1837 copy, carrying the 1837 text plus British compositor changes.",
    "/1-ne/1?v1=1841&v2=2013",
  ),
  "2013": info(
    "2013",
    "The current edition published by The Church of Jesus Christ of Latter-day Saints, descended from the 1837 text through later revisions.",
    "/1-ne/1?v1=pm&v2=2013",
  ),
};

export function getVersionInfo(key: string): VersionInfo | null {
  return VERSION_INFO[key] ?? null;
}

const TITLE_MAX_LENGTH = 70;
const TITLE_SUFFIX = " — Book of Mormon Compare";

export function versionPageTitle(info: VersionInfo): string {
  const full = `${info.name}${TITLE_SUFFIX}`;
  if (full.length <= TITLE_MAX_LENGTH) return full;

  const short = `${info.shortName}${TITLE_SUFFIX}`;
  if (short.length <= TITLE_MAX_LENGTH) return short;

  return info.shortName;
}
