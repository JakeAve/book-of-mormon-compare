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
  const showChapter = book !== "title-page" && book !== "witnesses";

  return `<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
  <rect width="1200" height="630" fill="#1C1C1C"/>
  <rect x="28" y="28" width="1144" height="574" fill="none" stroke="#E8E0D0" stroke-width="1.5"/>
  <path d="M28 80 L28 28 L80 28" stroke="#C48A4A" stroke-width="3" fill="none"/>
  <path d="M1172 80 L1172 28 L1120 28" stroke="#C48A4A" stroke-width="3" fill="none"/>
  <path d="M28 550 L28 602 L80 602" stroke="#C48A4A" stroke-width="3" fill="none"/>
  <path d="M1172 550 L1172 602 L1120 602" stroke="#C48A4A" stroke-width="3" fill="none"/>
  <text x="600" y="160" text-anchor="middle" font-family="Cormorant Garamond, serif" font-size="28" fill="#BBBBBB" letter-spacing="5">BOOK OF MORMON COMPARE</text>
  <line x1="520" y1="188" x2="680" y2="188" stroke="#C48A4A" stroke-width="2"/>
  <text x="600" y="338" text-anchor="middle" font-family="Cormorant Garamond, serif" font-size="96" fill="#F4F0E8">${
    showChapter ? `${bookName}  |  Chapter ${chapterEsc}` : bookName
  }</text>
  <text x="300" y="455" text-anchor="middle" font-family="Cormorant Garamond, serif" font-size="42" fill="#C48A4A">${v1Name}</text>
  <text x="600" y="455" text-anchor="middle" font-family="Cormorant Garamond, serif" font-size="34" fill="#AAAAAA">vs</text>
  <text x="900" y="455" text-anchor="middle" font-family="Cormorant Garamond, serif" font-size="42" fill="#C48A4A">${v2Name}</text>
  <text x="600" y="525" text-anchor="middle" font-family="Cormorant Garamond, serif" font-size="26" fill="#AAAAAA" letter-spacing="4">SIDE-BY-SIDE TEXTUAL COMPARISON</text>
</svg>`;
}
