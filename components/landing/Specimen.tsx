import type { JSX } from "preact/jsx-runtime";
import { diff, type Token } from "@/lib/diff.ts";
import { isPunctuation } from "@/lib/textHelpers.ts";

export interface SpecimenProps {
  reference: string;
  href: string;
  v1Label: string;
  v2Label: string;
  text1: string;
  text2: string;
}

function renderColumn(
  tokens: Token[],
  side: "col1" | "col2",
): JSX.Element[] {
  const filtered = side === "col1"
    ? tokens.filter((t) => !t.added)
    : tokens.filter((t) => !t.removed);

  return filtered.map((t, i) => {
    const needsSpace = i > 0 && !isPunctuation(t.value);
    const isChanged = side === "col1" ? t.removed : t.added;
    return (
      <span key={i}>
        {needsSpace ? " " : ""}
        {isChanged
          ? (
            <span
              class="highlight"
              style={{
                backgroundColor: side === "col1"
                  ? "var(--color-side1-highlight)"
                  : "var(--color-side2-highlight)",
              }}
            >
              {t.value}
            </span>
          )
          : t.value}
      </span>
    );
  });
}

export default function Specimen(
  { reference, href, v1Label, v2Label, text1, text2 }: SpecimenProps,
) {
  const tokens = diff(text1, text2);

  return (
    <section class="px-6 py-10 sm:py-14">
      <div class="max-w-3xl mx-auto flex flex-col gap-5">
        <p class="landing-eyebrow text-center">
          Specimen No. 1 — {reference}
        </p>
        <div class="landing-plate">
          <div class="grid sm:grid-cols-2 gap-6 sm:gap-8">
            <div class="flex flex-col gap-2">
              <p class="landing-eyebrow" style={{ opacity: 0.75 }}>
                {v1Label}
              </p>
              <p
                class="font-serif text-base sm:text-lg leading-relaxed"
                style={{ color: "var(--color-text)" }}
              >
                {renderColumn(tokens, "col1")}
              </p>
            </div>
            <div class="flex flex-col gap-2 pt-4 sm:pt-0 sm:pl-8 border-t sm:border-t-0 sm:border-l border-[var(--color-divider)]">
              <p class="landing-eyebrow" style={{ opacity: 0.75 }}>
                {v2Label}
              </p>
              <p
                class="font-serif text-base sm:text-lg leading-relaxed"
                style={{ color: "var(--color-text)" }}
              >
                {renderColumn(tokens, "col2")}
              </p>
            </div>
          </div>
        </div>
        <p class="text-center">
          <a
            href={href}
            class="font-serif underline underline-offset-4"
            style={{ color: "var(--color-text)" }}
          >
            Read this chapter in full →
          </a>
        </p>
      </div>
    </section>
  );
}
