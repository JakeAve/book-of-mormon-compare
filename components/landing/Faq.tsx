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
      "The documentary record includes two early manuscripts — the Original Manuscript and the Printer's Manuscript — and a chain of printed editions beginning with the 1830 first edition through the current editions used today. See the Versions page for a list and historical summary of each.",
  },
  {
    question: "Why was the Book of Mormon changed?",
    answer:
      "Changes entered the text at several stages: scribes copying dictation, typesetters preparing each new printing, and editors correcting grammar and standardizing wording in later editions. Comparing manuscripts and editions side by side shows which category of change produced any given difference.",
  },
  {
    question: 'What are the most significant "real" changes to the text?',
    answer:
      'A comprehensive list of substantive changes would depend on the compiler\'s opinion of substance. The largest addition was included by Joseph Smith for the 1840 edition with the phrase "or out of the waters of baptism" to 1 Nephi 20:1. The largest standing omission was made during the 1830 printing, where the duplicate passage in 1 Nephi 14:2 "if it so be that they hearden not their hearts against the Lamb of God; and if it so be that they hearden not their hearts against the Lamb of God" was corrected to remove the repeated phrase. While the Printer\'s Manuscript has the duplicated phrase crossed out, many copies of the 18030 edition were already printed before the correction was made. The Original Manuscript of the passage is nonextant, so it is impossible to know if the repeated phrase came from the Original Manuscript. Other changes that most Book of Mormon readers consider clarifying, rather than substantive, are passages in 1 Nephi 11 where the phrases "the mother of God," "the Eternal Father," and "the Everlasting God" where updated to "the mother of the Son of God," "the Son of the Eternal Father," and "the Son of the everlasting God," for the 1837 edition.',
  },
];

export default function Faq() {
  return (
    <section class="landing-scroll-reveal px-6 py-10 sm:py-14">
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
