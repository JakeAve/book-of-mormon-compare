import { assert } from "@std/assert";
import { LANDING_TITLE } from "./index.tsx";
import { MAX_TITLE_LENGTH } from "@/lib/variantStats.ts";

// The generated titles are swept in lib/variantStats.test.ts. This one is
// hand-written, so it never passes through that fallback and needs its own guard.
Deno.test("landing title fits the title budget", () => {
  assert(
    LANDING_TITLE.length <= MAX_TITLE_LENGTH,
    `landing title is ${LANDING_TITLE.length} chars, over ${MAX_TITLE_LENGTH}: ${LANDING_TITLE}`,
  );
});
