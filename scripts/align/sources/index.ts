import { pm } from "./pm.ts";
import { om } from "./om.ts";
import { ed1830 } from "./_1830.ts";
import { ed1837 } from "./_1837.ts";
import type { SourceAdapter } from "./types.ts";

export const ADAPTERS: Record<string, SourceAdapter> = {
  pm,
  om,
  "1830": ed1830,
  "1837": ed1837,
};

export function getAdapter(slug: string): SourceAdapter | undefined {
  return ADAPTERS[slug];
}

export type { CursorConfig, SourceAdapter } from "./types.ts";
export { DEFAULT_CURSOR_CONFIG } from "./types.ts";
