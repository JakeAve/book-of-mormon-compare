// Source adapter registry. Auto-discovers every `*.ts` file in this directory
// (excluding `index.ts`, `types.ts`, and `*.test.ts`) and expects each to
// default-export a `SourceAdapter`. To add a new source, drop a new adapter
// file alongside this one — no edits here required.

import type { SourceAdapter } from "./types.ts";

const here = new URL(".", import.meta.url);

async function loadAdapters(): Promise<Record<string, SourceAdapter>> {
  const out: Record<string, SourceAdapter> = {};
  for await (const entry of Deno.readDir(here)) {
    if (!entry.isFile) continue;
    if (!entry.name.endsWith(".ts")) continue;
    if (entry.name.endsWith(".test.ts")) continue;
    if (entry.name === "index.ts" || entry.name === "types.ts") continue;
    const url = new URL(entry.name, here).href;
    const mod = await import(url);
    const adapter = mod.default as SourceAdapter | undefined;
    if (
      !adapter || typeof adapter !== "object" ||
      typeof adapter.slug !== "string"
    ) {
      throw new Error(
        `scripts/align/sources/${entry.name} must default-export a SourceAdapter`,
      );
    }
    if (out[adapter.slug]) {
      throw new Error(
        `duplicate adapter slug "${adapter.slug}" (in ${entry.name})`,
      );
    }
    out[adapter.slug] = adapter;
  }
  return out;
}

export const ADAPTERS: Record<string, SourceAdapter> = await loadAdapters();

export function getAdapter(slug: string): SourceAdapter | undefined {
  return ADAPTERS[slug];
}

export type { CursorConfig, SourceAdapter } from "./types.ts";
export { DEFAULT_CURSOR_CONFIG } from "./types.ts";
