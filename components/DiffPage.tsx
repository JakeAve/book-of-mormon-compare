import type { ComponentChildren } from "preact";
import type { Verse } from "../lib/data.ts";
import { Diff } from "./Diff.tsx";

interface Props {
  verses1: Verse[];
  verses2: Verse[];
  header1: ComponentChildren;
  header2: ComponentChildren;
}

export function DiffPage({ verses1, verses2, header1, header2 }: Props) {
  return (
    <main class="p-4 md:px-6">
      <div
        data-diff-container
        class="mx-auto grid grid-cols-2 max-w-4xl gap-2 md:gap-4 font-serif relative"
      >
        <div
          class="col-start-1 col-span-1 sticky top-0 py-2 z-10"
          style={{ backgroundColor: "var(--color-bg-sticky)" }}
        >
          {header1}
        </div>
        <div
          class="col-start-2 col-span-1 sticky top-0 py-2 z-10"
          style={{ backgroundColor: "var(--color-bg-sticky)" }}
        >
          {header2}
        </div>
        <Diff verses1={verses1} verses2={verses2} startRow={1} />
      </div>
    </main>
  );
}
