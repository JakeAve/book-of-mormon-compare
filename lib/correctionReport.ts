import {
  getBookDisplayName,
  getVersionDisplayName,
  isBookAbbr,
  VERSION_DISPLAY_NAMES,
} from "@/lib/data.ts";
import { CHAPTER_COUNTS } from "@/lib/bookChapters.ts";

export const ERROR_TYPES = [
  "verse-boundary",
  "spacing-hyphenation",
  "typo",
  "other",
] as const;

export type ErrorType = typeof ERROR_TYPES[number];

export const ERROR_TYPE_LABELS: Record<ErrorType, string> = {
  "verse-boundary": "Words in the wrong verse",
  "spacing-hyphenation": "Spacing or hyphenation",
  "typo": "Transcription typo",
  "other": "Other",
};

export interface CorrectionReport {
  version: string;
  comparedWith: string;
  book: string;
  chapter: number;
  verses: number[];
  errorType: ErrorType;
  selectedText: string;
  expectedText: string;
  description: string;
  url: string;
}

const MAX_SELECTED = 500;
const MAX_EXPECTED = 500;
const MAX_DESCRIPTION = 2000;
const MAX_URL = 500;
const MAX_VERSES = 20;

type ParseResult =
  | { ok: true; report: CorrectionReport }
  | { ok: false; error: string };

function optionalString(value: unknown, max: number): string | null {
  if (value === undefined || value === null) return "";
  if (typeof value !== "string" || value.length > max) return null;
  return value;
}

export function parseCorrectionReport(input: unknown): ParseResult {
  if (typeof input !== "object" || input === null) {
    return { ok: false, error: "payload must be an object" };
  }
  const o = input as Record<string, unknown>;

  const version = o.version;
  if (typeof version !== "string" || !(version in VERSION_DISPLAY_NAMES)) {
    return { ok: false, error: "unknown version" };
  }
  const comparedWith = o.comparedWith;
  if (
    typeof comparedWith !== "string" || !(comparedWith in VERSION_DISPLAY_NAMES)
  ) {
    return { ok: false, error: "unknown comparedWith version" };
  }
  const book = o.book;
  if (typeof book !== "string" || !isBookAbbr(book)) {
    return { ok: false, error: "unknown book" };
  }
  const chapter = o.chapter;
  if (
    typeof chapter !== "number" || !Number.isInteger(chapter) ||
    chapter < 1 || chapter > CHAPTER_COUNTS[book]
  ) {
    return { ok: false, error: "chapter out of range" };
  }
  const verses = o.verses;
  if (
    !Array.isArray(verses) || verses.length === 0 ||
    verses.length > MAX_VERSES ||
    !verses.every((v) =>
      typeof v === "number" && Number.isInteger(v) && v >= 1 && v <= 300
    )
  ) {
    return { ok: false, error: "invalid verses" };
  }
  const errorType = o.errorType;
  if (
    typeof errorType !== "string" ||
    !(ERROR_TYPES as readonly string[]).includes(errorType)
  ) {
    return { ok: false, error: "unknown errorType" };
  }
  const selectedText = optionalString(o.selectedText, MAX_SELECTED);
  const expectedText = optionalString(o.expectedText, MAX_EXPECTED);
  const description = optionalString(o.description, MAX_DESCRIPTION);
  const url = optionalString(o.url, MAX_URL);
  if (selectedText === null) {
    return { ok: false, error: "selectedText too long" };
  }
  if (expectedText === null) {
    return { ok: false, error: "expectedText too long" };
  }
  if (description === null) return { ok: false, error: "description too long" };
  if (url === null) return { ok: false, error: "url too long" };
  if (url !== "" && !/^https?:\/\/\S+$/.test(url)) {
    return { ok: false, error: "invalid url" };
  }

  return {
    ok: true,
    report: {
      version,
      comparedWith,
      book,
      chapter,
      verses: [...new Set(verses as number[])].sort((a, b) => a - b),
      errorType: errorType as ErrorType,
      selectedText,
      expectedText,
      description,
      url,
    },
  };
}

function formatVerseRange(verses: number[]): string {
  if (verses.length === 1) return String(verses[0]);
  return `${verses[0]}–${verses[verses.length - 1]}`;
}

export function formatReference(r: CorrectionReport): string {
  return `${getBookDisplayName(r.book)} ${r.chapter}:${
    formatVerseRange(r.verses)
  }`;
}

export function buildIssueTitle(r: CorrectionReport): string {
  return `[correction] ${r.version} — ${formatReference(r)}`;
}

function quoteBlock(text: string): string {
  return text.split("\n").map((line) => `> ${line}`).join("\n");
}

export function buildIssueBody(r: CorrectionReport): string {
  const parts: string[] = [
    `**Version:** ${getVersionDisplayName(r.version)}`,
    `**Compared with:** ${getVersionDisplayName(r.comparedWith)}`,
    `**Reference:** ${formatReference(r)}`,
    `**Error type:** ${ERROR_TYPE_LABELS[r.errorType]}`,
  ];
  if (r.selectedText) {
    parts.push(`**Reported text:**\n${quoteBlock(r.selectedText)}`);
  }
  if (r.expectedText) {
    parts.push(`**Should say:**\n${quoteBlock(r.expectedText)}`);
  }
  if (r.description) {
    parts.push(`**Reporter's note:**\n${quoteBlock(r.description)}`);
  }
  if (r.url) {
    parts.push(`**Page:** ${r.url}`);
  }
  parts.push(
    "---\n\n```json\n" + JSON.stringify(r, null, 2) + "\n```",
  );
  return parts.join("\n\n");
}

/** Recover the structured report from an issue body. Parses only the FINAL
 *  fenced json block — the body's user-supplied text is untrusted and could
 *  contain a spoofed earlier block. */
export function extractReportFromIssueBody(
  body: string,
): CorrectionReport | null {
  const blocks = [...body.matchAll(/```json\n([\s\S]+?)\n```/g)];
  if (blocks.length === 0) return null;
  try {
    const parsed = parseCorrectionReport(
      JSON.parse(blocks[blocks.length - 1][1]),
    );
    return parsed.ok ? parsed.report : null;
  } catch {
    return null;
  }
}

/** Same version + book + chapter with overlapping verses is the same
 *  underlying error. `comparedWith` is deliberately ignored — the same
 *  defect is visible regardless of which version it was compared against. */
export function isDuplicateReport(
  a: CorrectionReport,
  b: CorrectionReport,
): boolean {
  if (a.version !== b.version) return false;
  if (a.book !== b.book || a.chapter !== b.chapter) return false;
  const set = new Set(a.verses);
  return b.verses.some((v) => set.has(v));
}

export function parseVersesInput(s: string): number[] | null {
  const trimmed = s.trim();
  if (trimmed === "") return null;
  const rangeMatch = trimmed.match(/^(\d+)\s*[-–]\s*(\d+)$/);
  if (rangeMatch) {
    const lo = parseInt(rangeMatch[1], 10);
    const hi = parseInt(rangeMatch[2], 10);
    if (lo < 1 || hi < lo || hi - lo >= 20) return null;
    return Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
  }
  const nums = trimmed.split(",").map((p) => parseInt(p.trim(), 10));
  if (nums.length === 0 || nums.some((n) => !Number.isInteger(n) || n < 1)) {
    return null;
  }
  return [...new Set(nums)].sort((a, b) => a - b);
}
