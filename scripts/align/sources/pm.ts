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

    // 2 Nephi overrides
    {
      // PM p59:25 reads "visions in the night time & by day..." — "night time"
      // (indices 3–4) closes v23's clause about visions and belongs there.
      page: 59,
      line: 25,
      wordRange: [3, 4],
      target: { book: "2-ne", chapter: 4, verse: 23 },
      note: "leading 'night time' belongs to 2 Ne 4:23",
    },
    {
      // PM p61:24 reads "& that they should labour with their hands & it came
      // to pass..." — "hands" (index 7) closes v17's sentence and belongs there.
      page: 61,
      line: 24,
      wordIndices: [7],
      target: { book: "2-ne", chapter: 5, verse: 17 },
      note:
        "leading 'hands' belongs to 2 Ne 5:17 (completes 'labour with their hands')",
    },
    {
      // PM p64:36 reads "y Judgment...my righteousness is" — the phrase
      // "my righteousness is" (indices 11–13) opens v5 canonically
      // ("My righteousness is near; my salvation is gone forth...").
      page: 64,
      line: 36,
      wordRange: [11, 13],
      target: { book: "2-ne", chapter: 8, verse: 5 },
      note: "trailing 'my righteousness is' belongs to 2 Ne 8:5",
    },
    {
      // PM p74:11 reads "the wimples & the crisping pins the glasses..." —
      // "crisping pins" (indices 4–5) closes v22 canonically
      // ("...the wimples, and the crisping pins").
      page: 74,
      line: 11,
      wordRange: [4, 5],
      target: { book: "2-ne", chapter: 13, verse: 22 },
      note: "leading 'crisping pins' belongs to 2 Ne 13:22",
    },
    {
      // PM p85:5 reads "ten them & as one generation hath been destroid..." —
      // "as one generation hath been destroid" (indices 2–8) opens v9
      // canonically ("And as one generation hath been destroyed...").
      page: 85,
      line: 5,
      wordRange: [2, 8],
      target: { book: "2-ne", chapter: 25, verse: 9 },
      note:
        "trailing 'as one generation hath been destroid' belongs to 2 Ne 25:9",
    },
    {
      // PM p88:11 ends "...shall not be for" where "for" is the first half of
      // the split word "forgotten". Belongs to v15 to complete "shall not be
      // forgotten" (canon 2 Ne 26:15).
      page: 88,
      line: 11,
      wordIndices: [16],
      target: { book: "2-ne", chapter: 26, verse: 15 },
      note:
        "'for' is first half of split word 'forgotten', belongs to 2 Ne 26:15",
    },
    {
      // PM p88:12 begins "gotten for they which shall be destroid..." — "gotten"
      // (index 0) completes "forgotten" from the line above, closing v15.
      page: 88,
      line: 12,
      wordIndices: [0],
      target: { book: "2-ne", chapter: 26, verse: 15 },
      note: "'gotten' completes split word 'forgotten', belongs to 2 Ne 26:15",
    },

    // Jacob overrides
    {
      // PM p107:34 reads "...unto mine ownself & the servant..." — "ownself"
      // (index 7) closes v33's sentence and belongs there.
      page: 107,
      line: 34,
      wordIndices: [7],
      target: { book: "jacob", chapter: 5, verse: 33 },
      note: "leading 'ownself' belongs to Jacob 5:33",
    },
    {
      // PM p108:24 reads "...& thou beholdest that a part thereof..." — the
      // clause "& thou beholdest that a" (indices 6–10) opens v45 canonically
      // and belongs there.
      page: 108,
      line: 24,
      wordRange: [6, 10],
      target: { book: "jacob", chapter: 5, verse: 45 },
      note: "trailing '& thou beholdest that a' belongs to Jacob 5:45",
    },

    // Mosiah overrides — text insertions
    {
      // OC added a caret insertion after "possess the power of God" in the PM
      // (Mosiah 8:16) that the JSP transcript did not capture. The inserted
      // text reads "which no man can yet a man may have great power".
      insertText:
        " which no man can yet a man may have great power given him from God ",
      insertAfterLine: { page: 135, line: 29 },
      insertAfterWordIndex: 11,
      target: { book: "mosiah", chapter: 8, verse: 16 },
      note:
        "OC caret insertion after 'possess the power of God', not in JSP PM transcript",
    },

    // Mosiah overrides — word reassignments
    {
      // PM p135:29 reads "...possess the power of God but a seer can know of
      // thin" — "but a seer can know of thin" (indices 12–18) opens v17
      // canonically ("But a seer can know of things...").
      page: 135,
      line: 29,
      wordRange: [12, 18],
      target: { book: "mosiah", chapter: 8, verse: 17 },
      note: "trailing 'but a seer can know of thin' belongs to Mosiah 8:17",
    },
    {
      // PM p135:30 begins "gs which has past..." — "gs which" (indices 0–1)
      // completes the split word "things" from the line above and belongs to
      // v17 with the rest of that sentence.
      page: 135,
      line: 30,
      wordRange: [0, 1],
      target: { book: "mosiah", chapter: 8, verse: 17 },
      note: "'gs which' completes split word 'things', belongs to Mosiah 8:17",
    },
    {
      // PM p134:3 reads "we to Mourn yea I say unto you great are..." — "yea
      // I say unto" (indices 3–6) opens v24's speech and belongs there.
      page: 134,
      line: 3,
      wordRange: [3, 6],
      target: { book: "mosiah", chapter: 7, verse: 24 },
      note: "trailing 'yea I say unto' belongs to Mosiah 7:24",
    },
    {
      // PM p142:31 reads "...what sayest thou & they answered & said that
      // salvation..." — "& they answered & said that" (indices 6–11) opens
      // v32 canonically and belongs there.
      page: 142,
      line: 31,
      wordRange: [6, 11],
      target: { book: "mosiah", chapter: 12, verse: 32 },
      note: "trailing '& they answered & said that' belongs to Mosiah 12:32",
    },
    {
      // PM p160:22 begins "in the wilderness yea & in the vally of Alma..." —
      // "in the wilderness" (indices 0–2) closes v20's narrative and belongs
      // there.
      page: 160,
      line: 22,
      wordRange: [0, 2],
      target: { book: "mosiah", chapter: 24, verse: 20 },
      note: "leading 'in the wilderness' belongs to Mosiah 24:20",
    },
    {
      // PM p161:27 reads "...faith on the Lord and he did" — "the Lord and"
      // (indices 8–10) completes "faith on the Lord" closing v15.
      page: 161,
      line: 27,
      wordRange: [8, 10],
      target: { book: "mosiah", chapter: 25, verse: 15 },
      note:
        "leading 'the Lord and' belongs to Mosiah 25:15 (completes 'faith on the Lord')",
    },
    {
      // PM p171:4 reads "...anniqity and whosoever hath Committid aniqity..." —
      // "and whosoever hath Committid" (indices 4–7) opens v15 canonically.
      page: 171,
      line: 4,
      wordRange: [4, 7],
      target: { book: "mosiah", chapter: 29, verse: 15 },
      note: "trailing 'and whosoever hath committid' belongs to Mosiah 29:15",
    },
  ],
};

export default pm;
