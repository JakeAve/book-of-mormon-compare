import { signal } from "@preact/signals";

export type ReportRequest =
  | { verses: number[]; selectedText: string }
  | "manual";

export const reportRequest = signal<ReportRequest | null>(null);
