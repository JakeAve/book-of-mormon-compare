import { DEFAULT_CURSOR_CONFIG, type SourceAdapter } from "./types.ts";

// Printer's Manuscript (PM): scribal transcription of the dictation,
// generally MORE verbose than the canonical 2013 text. Default cursor
// settings are tuned for PM.
const pm: SourceAdapter = {
  slug: "pm",
  label: "Printer's Manuscript",
  raw: "data/raw/pm",
  out: "data/bom/pm",
  cursor: DEFAULT_CURSOR_CONFIG,
  overrides: [
    {
      // PM p6:7 begins "it & it came to pass that as he read..." — the opening
      // "it" completes v11's sentence ("bade him that he should read it") but
      // the cursor assigns it to v12. Canon v12 starts "And it came to pass".
      page: 6,
      line: 7,
      wordIndices: [3],
      target: { book: "1-ne", chapter: 1, verse: 11 },
      note: "opening 'it' belongs to 1 Ne 1:11 (completes 'should read it')",
    },
    {
      // PM p15:4 reads "thful in him & if it so be" — the trailing clause
      // "& if it so be" (word indices 3–7) belongs to v13, which canonically
      // opens "And if it so be that ye are faithful...".
      page: 15,
      line: 4,
      wordRange: [3, 7],
      target: { book: "1-ne", chapter: 7, verse: 13 },
      note: "trailing '& if it so be' belongs to 1 Ne 7:13",
    },
    {
      // PM p16:34 reads "unto me & I beheld a rod of iron &" — from "& I
      // beheld" onward (indices 2–9) belongs to v19, which canonically opens
      // "And I beheld a rod of iron...".
      page: 16,
      line: 34,
      wordRange: [2, 19],
      target: { book: "1-ne", chapter: 8, verse: 19 },
      note: "trailing '& I beheld a rod of iron &' belongs to 1 Ne 8:19",
    },
    {
      // PM p17:9 is a standalone "the" that opens v25 but belongs with v24.
      // Canon v24 ends "...and they did come forth and partake of the fruit of
      // the tree."
      page: 17,
      line: 9,
      target: { book: "1-ne", chapter: 8, verse: 24 },
      note:
        "leading 'the' (start of 'the fruit of the tree') belongs to 1 Ne 8:24",
    },
    {
      // PM p17:10 begins "fruit of the tree they did cast their eyes..." —
      // "fruit of the tree" (indices 0–3) closes v24's sentence; the cursor
      // assigns it to v25.
      page: 17,
      line: 10,
      wordRange: [0, 3],
      target: { book: "1-ne", chapter: 8, verse: 24 },
      note: "leading 'fruit of the tree' belongs to 1 Ne 8:24",
    },
    {
      // PM p48:10 ends "...& since that they have been lead" — this clause
      // (indices 10–16) opens v5's topic canonically ("And since they have
      // been led away, these things have been prophesied...") but the cursor
      // assigns it to v4.
      page: 48,
      line: 10,
      wordRange: [10, 16],
      target: { book: "1-ne", chapter: 22, verse: 5 },
      note: "trailing '& since that they have been lead' belongs to 1 Ne 22:5",
    },
    {
      // PM p48:11 is "away" — the continuation of the clause above, split
      // across a line break.
      page: 48,
      line: 11,
      target: { book: "1-ne", chapter: 22, verse: 5 },
      note: "trailing 'away' (end of 'lead away') belongs to 1 Ne 22:5",
    },
  ],
};

export default pm;
