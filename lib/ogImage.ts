import {
  getBookDisplayName,
  getVersionDisplayName,
  VERSION_SHORT_NAMES,
} from "./data.ts";

export interface OgImageParams {
  book: string;
  chapter: string;
  v1: string;
  v2: string;
}

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
  <text x="600" y="160" text-anchor="middle" font-family="Cormorant Garamond, serif" font-size="22" fill="#888888" letter-spacing="4">BOOK OF MORMON COMPARE</text>
  <line x1="540" y1="185" x2="660" y2="185" stroke="#C48A4A" stroke-width="2"/>
  <text x="600" y="310" text-anchor="middle" font-family="Cormorant Garamond, serif" font-size="96" fill="#F4F0E8">${bookName}</text>
  <text x="600" y="390" text-anchor="middle" font-family="Cormorant Garamond, serif" font-size="58" fill="#F4F0E8">Chapter ${chapterEsc}</text>
  <text x="300" y="490" text-anchor="middle" font-family="Cormorant Garamond, serif" font-size="30" fill="#C48A4A">${v1Name}</text>
  <text x="600" y="490" text-anchor="middle" font-family="Cormorant Garamond, serif" font-size="24" fill="#555555">vs</text>
  <text x="900" y="490" text-anchor="middle" font-family="Cormorant Garamond, serif" font-size="30" fill="#C48A4A">${v2Name}</text>
  <text x="600" y="570" text-anchor="middle" font-family="Cormorant Garamond, serif" font-size="18" fill="#666666" letter-spacing="3">SIDE-BY-SIDE TEXTUAL COMPARISON</text>
</svg>`;
}
