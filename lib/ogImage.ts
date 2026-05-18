import { getBookDisplayName, getVersionDisplayName } from "./data.ts";

export interface OgImageParams {
  book: string;
  chapter: string;
  v1: string;
  v2: string;
}

const VERSION_SHORT_NAMES: Record<string, string> = {
  "om": "Original Manuscript",
  "pm": "Printer's Manuscript",
  "1830": "1830 First Edition",
  "1837": "1837 Second Edition",
  "2013": "2013 Edition",
};

function getShortVersionName(version: string): string {
  return VERSION_SHORT_NAMES[version] ?? getVersionDisplayName(version);
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function buildOgImageSvg(params: OgImageParams): string {
  const { book, chapter, v1, v2 } = params;
  const bookName = escapeXml(getBookDisplayName(book));
  const v1Name = escapeXml(getShortVersionName(v1));
  const v2Name = escapeXml(getShortVersionName(v2));
  const chapterEsc = escapeXml(chapter);

  return `<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
  <rect width="1200" height="630" fill="#1C1C1C"/>
  <rect x="28" y="28" width="1144" height="574" fill="none" stroke="#E8E0D0" stroke-width="1.5"/>
  <path d="M28 80 L28 28 L80 28" stroke="#C48A4A" stroke-width="3" fill="none"/>
  <path d="M1172 80 L1172 28 L1120 28" stroke="#C48A4A" stroke-width="3" fill="none"/>
  <path d="M28 550 L28 602 L80 602" stroke="#C48A4A" stroke-width="3" fill="none"/>
  <path d="M1172 550 L1172 602 L1120 602" stroke="#C48A4A" stroke-width="3" fill="none"/>
  <text x="600" y="195" text-anchor="middle" font-family="Georgia, serif" font-size="16" fill="#888888" letter-spacing="4">BOOK OF MORMON COMPARE</text>
  <line x1="560" y1="218" x2="640" y2="218" stroke="#C48A4A" stroke-width="2"/>
  <text x="600" y="322" text-anchor="middle" font-family="Georgia, serif" font-size="68" fill="#F4F0E8">${bookName}</text>
  <text x="600" y="388" text-anchor="middle" font-family="Georgia, serif" font-size="44" fill="#F4F0E8">Chapter ${chapterEsc}</text>
  <text x="320" y="460" text-anchor="middle" font-family="Georgia, serif" font-size="21" fill="#C48A4A">${v1Name}</text>
  <text x="600" y="460" text-anchor="middle" font-family="sans-serif" font-size="16" fill="#555555">vs</text>
  <text x="880" y="460" text-anchor="middle" font-family="Georgia, serif" font-size="21" fill="#C48A4A">${v2Name}</text>
  <text x="600" y="530" text-anchor="middle" font-family="sans-serif" font-size="13" fill="#666666" letter-spacing="3">SIDE-BY-SIDE TEXTUAL COMPARISON</text>
</svg>`;
}
