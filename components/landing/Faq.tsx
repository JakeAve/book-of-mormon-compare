export interface FaqItem {
  question: string;
  answer: string;
}

export const FAQ_ITEMS: FaqItem[] = [
  {
    question: "How many changes have been made to the Book of Mormon?",
    answer:
      "Thousands of small changes have accumulated across its printing history — mostly spelling, punctuation, and grammar. A much smaller number involve wording. This site lets you compare any two editions verse by verse and see every one of them directly, rather than relying on a summary count.",
  },
  {
    question: "What versions and editions of the Book of Mormon exist?",
    answer:
      "The documentary record includes two early manuscripts — the Original Manuscript and the Printer's Manuscript — and a chain of printed editions beginning with the 1830 first edition through the current edition used today. See the Versions page for a list and historical summary of each.",
  },
  {
    question: "Why was the Book of Mormon changed?",
    answer:
      "Changes entered the text at several stages: scribes copying dictation, typesetters preparing each new printing, and editors correcting grammar and standardizing wording in later editions. Comparing manuscripts and editions side by side shows which category of change produced any given difference.",
  },
  {
    question: "How does the 1830 edition compare to today's edition?",
    answer:
      "The 1830 first edition has no verse numbers and reflects the original typesetting from the Printer's Manuscript. Today's edition has been through additional rounds of grammatical correction and standardization. The two can be compared directly, verse by verse, in the reader.",
  },
  {
    question: "Is the Book of Mormon still being updated?",
    answer:
      "The current edition has been revised periodically since 1837, most recently in 2013, generally for minor corrections and formatting rather than substantive wording changes.",
  },
];

export default function Faq() {
  return (
    <section class="px-6 py-10 sm:py-14">
      <div class="max-w-2xl mx-auto flex flex-col gap-6">
        <p class="landing-eyebrow text-center">Frequently asked</p>
        <div class="flex flex-col gap-4">
          {FAQ_ITEMS.map((item) => (
            <details key={item.question} class="group">
              <summary
                class="font-serif text-lg font-semibold cursor-pointer list-none flex items-center justify-between gap-4"
                style={{ color: "var(--color-text)" }}
              >
                <span>{item.question}</span>
                <span
                  aria-hidden="true"
                  class="shrink-0 transition-transform group-open:rotate-45"
                  style={{ color: "var(--color-accent)", fontSize: "1.25rem" }}
                >
                  +
                </span>
              </summary>
              <p
                class="font-serif text-base leading-relaxed mt-2"
                style={{ color: "var(--color-muted)" }}
              >
                {item.answer}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
