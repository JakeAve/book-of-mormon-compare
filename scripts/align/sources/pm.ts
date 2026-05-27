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
      // beheld" onward (indices 2–19) belongs to v19, which canonically opens
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
      // OC added a caret insertion after "possess the power of God" in the PM
      // (Mosiah 8:16) that the JSP transcript did not capture.
      insertText:
        " which no man can yet a man may have great power given him from God ",
      insertAfterLine: { page: 135, line: 29 },
      insertAfterWordIndex: 11,
      target: { book: "mosiah", chapter: 8, verse: 16 },
      note:
        "OC caret insertion after 'possess the power of God', not in JSP PM transcript",
    },
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
    {
      // PM p175:23 ends "...no persecution among them" — "them" (index 13)
      // is the first half of split word "themselves" closing v21 canonically.
      page: 175,
      line: 23,
      wordIndices: [13],
      target: { book: "alma", chapter: 1, verse: 21 },
      note:
        "'them' is first half of split word 'themselves', belongs to Alma 1:21",
    },
    {
      // PM p175:24 begins "selves, Neverless there were many..." — "selves"
      // (index 0) completes "themselves" closing v21.
      page: 175,
      line: 24,
      wordIndices: [0],
      target: { book: "alma", chapter: 1, verse: 21 },
      note: "'selves' completes split word 'themselves', belongs to Alma 1:21",
    },
    {
      // PM p178:15 reads "...& it came to pass thot on the morrow" — "& it
      // came to pass thot" (indices 7–12) opens v23 canonically.
      page: 178,
      line: 15,
      wordRange: [7, 12],
      target: { book: "alma", chapter: 2, verse: 23 },
      note: "trailing '& it came to pass thot' belongs to Alma 2:23",
    },
    {
      // PM p192:36 reads "vered it unto thee and behold I am sent..." — "thee"
      // (index 3) completes "delivered it unto thee" closing v15.
      page: 192,
      line: 36,
      wordIndices: [3],
      target: { book: "alma", chapter: 8, verse: 15 },
      note:
        "leading 'thee' belongs to Alma 8:15 (completes 'delivered it unto thee')",
    },
    {
      // PM p193:8 reads "...servant of God something to eat" — "something to
      // eat" (indices 16–18) closes the question in v19 canonically.
      page: 193,
      line: 8,
      wordRange: [16, 18],
      target: { book: "alma", chapter: 8, verse: 19 },
      note: "leading 'something to eat' belongs to Alma 8:19",
    },
    {
      // PM p196:24 reads "...stiffnecked People and also because I said..." —
      // "and also because" (indices 5–7) opens v32 canonically.
      page: 196,
      line: 24,
      wordRange: [5, 7],
      target: { book: "alma", chapter: 9, verse: 32 },
      note: "trailing 'and also because' belongs to Alma 9:32",
    },
    {
      // PM p197:12 reads "our Judges. as I was a Journeying to see a very near
      // Kindred Behold an Angel" — "our Judges" closes v6; "as I was a
      // Journeying..." (indices 2–15) opens v7 canonically.
      page: 197,
      line: 12,
      wordRange: [2, 15],
      target: { book: "alma", chapter: 10, verse: 7 },
      note: "trailing 'as I was a Journeying...' belongs to Alma 10:7",
    },
    {
      // OC caret insertion in Alma 10:7 after "thee and thy house" — the JSP
      // PM transcript does not capture this insertion.
      insertText:
        " & the blessing of the Lord shall rest upon thee and thy house ",
      insertAfterLine: { page: 197, line: 17 },
      insertAfterWordIndex: 3,
      target: { book: "alma", chapter: 10, verse: 7 },
      note:
        "OC caret insertion after 'thee and thy house', not in JSP PM transcript",
    },
    {
      // PM p197:17 reads "thee and thy house, and it came to pass that I
      // obeyed..." — "and it came to pass that I obeyed the voice of the
      // Angel and" (indices 4–17) opens v8 canonically.
      page: 197,
      line: 17,
      wordRange: [4, 17],
      target: { book: "alma", chapter: 10, verse: 8 },
      note:
        "trailing 'and it came to pass that I obeyed...' belongs to Alma 10:8",
    },
    {
      // PM p197:18 reads "returned towards my house and as I was a going
      // thither I found the man which" — whole line belongs to v8.
      page: 197,
      line: 18,
      target: { book: "alma", chapter: 10, verse: 8 },
      note: "trailing 'returned towards my house...' belongs to Alma 10:8",
    },
    {
      // PM p197:19 reads "the Angel said unto me thou shalt receive..." —
      // whole line belongs to v8; the cursor already placed words 3+ in v8
      // so targeting the full line is a no-op for those words.
      page: 197,
      line: 19,
      target: { book: "alma", chapter: 10, verse: 8 },
      note: "leading 'the Angel said' belongs to Alma 10:8",
    },
    {
      // PM p198:12 reads "es of God ye are laying plans to pervert the ways..." —
      // "ye are laying plans to pervert the ways of the righteous and to bring"
      // (indices 3–16) opens v18 canonically.
      page: 198,
      line: 12,
      wordRange: [3, 16],
      target: { book: "alma", chapter: 10, verse: 18 },
      note:
        "trailing 'ye are laying plans to pervert...' belongs to Alma 10:18",
    },
    {
      // PM p207:11 reads "...full of love & all long suffering having faith" —
      // "long suffering" (indices 7–8) closes v28 canonically
      // ("full of love and all long-suffering").
      page: 207,
      line: 11,
      wordRange: [7, 8],
      target: { book: "alma", chapter: 13, verse: 28 },
      note: "leading 'long suffering' belongs to Alma 13:28",
    },
    {
      // PM p212:24 reads "erness now it came to pass that the Nephites..." —
      // "now it came to pass" (indices 1–5) opens v4 canonically.
      page: 212,
      line: 24,
      wordRange: [1, 5],
      target: { book: "alma", chapter: 16, verse: 4 },
      note: "trailing 'now it came to pass' belongs to Alma 16:4",
    },
    {
      // PM p220:27 ends "...I do not know what that mean" — "mean" (index 16)
      // is the first half of split word "meaneth" closing v25 canonically.
      page: 220,
      line: 27,
      wordIndices: [16],
      target: { book: "alma", chapter: 18, verse: 25 },
      note:
        "'mean' is first half of split word 'meaneth', belongs to Alma 18:25",
    },
    {
      // PM p220:28 reads "eth & then Ammon saith...great spirit & he sa" —
      // "eth" (index 0) completes "meaneth" closing v25.
      page: 220,
      line: 28,
      wordIndices: [0],
      target: { book: "alma", chapter: 18, verse: 25 },
      note: "'eth' completes split word 'meaneth', belongs to Alma 18:25",
    },
    {
      // "spirit" (index 12) closes v26's question canonically
      // ("there is a Great Spirit?").
      page: 220,
      line: 28,
      wordIndices: [12],
      target: { book: "alma", chapter: 18, verse: 26 },
      note:
        "leading 'spirit' belongs to Alma 18:26 (completes 'a great spirit')",
    },
    {
      // PM p220:29 reads "it◊ yea & Ammon saith this is God..." — "it◊ yea"
      // (indices 0–1) closes v27's answer ("And he said, Yea.") canonically.
      page: 220,
      line: 29,
      wordRange: [0, 1],
      target: { book: "alma", chapter: 18, verse: 27 },
      note:
        "leading 'it yea' belongs to Alma 18:27 (completes 'said' + closes Yea)",
    },
    {
      // Caret insertion in Alma 19:25 after "Ammon was the great spirit" —
      // not in JSP PM transcript.
      insertText: " & others said he was sent by the great spirit ",
      insertAfterLine: { page: 224, line: 14 },
      insertAfterWordIndex: 13,
      target: { book: "alma", chapter: 19, verse: 25 },
      note:
        "caret insertion after 'Ammon was the great spirit', not in JSP PM transcript",
    },
    {
      // PM p224:14 reads "...great spirit but others rebuked them all saying
      // that he was a monster which hath been" — "but others rebuked..."
      // (indices 14–27) opens v26 canonically.
      page: 224,
      line: 14,
      wordRange: [14, 27],
      target: { book: "alma", chapter: 19, verse: 26 },
      note: "trailing 'but others rebuked...hath been' belongs to Alma 19:26",
    },
    {
      // PM p224:15 reads "sent from the Nephites to torment us & there were
      // some which said that" — "& there were some which said that" (indices
      // 7–13) opens v27 canonically ("And there were some who said that...").
      page: 224,
      line: 15,
      wordRange: [7, 13],
      target: { book: "alma", chapter: 19, verse: 27 },
      note:
        "trailing '& there were some which said that' belongs to Alma 19:27",
    },
    {
      // PM p224:16 reads "Ammon was sent by the great spirit to afflict them
      // because of their iniquities" — "Ammon was sent...afflict them" (the
      // cursor already placed 'because of their iniquities' in v27; targeting
      // the whole line moves the remaining words).
      page: 224,
      line: 16,
      target: { book: "alma", chapter: 19, verse: 27 },
      note:
        "leading 'Ammon was sent by the great spirit to afflict them' belongs to Alma 19:27",
    },
    {
      // PM p233:10 ends "...those which were with" — "with" (index 10) belongs
      // to v25 to complete "those who were with him" canonically.
      page: 233,
      line: 10,
      wordIndices: [10],
      target: { book: "alma", chapter: 22, verse: 25 },
      note:
        "leading 'with' belongs to Alma 22:25 (completes 'those which were with him')",
    },
    {
      // PM p233:11 begins "him & it came to pass..." — "him" (index 0) closes
      // v25 canonically ("those who were with him").
      page: 233,
      line: 11,
      wordIndices: [0],
      target: { book: "alma", chapter: 22, verse: 25 },
      note: "leading 'him' belongs to Alma 22:25 (completes 'with him')",
    },
    {
      // PM p239:15 reads "they are saved & there was not a wicked man..." —
      // "& there was not a" (indices 3–7) opens v27 canonically.
      page: 239,
      line: 15,
      wordRange: [3, 7],
      target: { book: "alma", chapter: 24, verse: 27 },
      note: "trailing '& there was not a' belongs to Alma 24:27",
    },
    {
      // PM p246:15 begins "everafter & they were among..." — "everafter"
      // (index 0) closes v26 canonically ("distinguished by that name ever after").
      page: 246,
      line: 15,
      wordIndices: [0],
      target: { book: "alma", chapter: 27, verse: 26 },
      note: "leading 'everafter' belongs to Alma 27:26",
    },
    {
      // PM p248:22 reads "...my joy is full but I do not goy in" — "but I do
      // not goy in" (indices 11–16) opens v14 canonically ("But I do not joy
      // in my own success alone").
      page: 248,
      line: 22,
      wordRange: [11, 16],
      target: { book: "alma", chapter: 29, verse: 14 },
      note: "trailing 'but I do not goy in' belongs to Alma 29:14",
    },
    {
      // PM p248:23 begins "my own succss alone..." — "my" (index 0) belongs
      // to v14 to open the phrase "my own success alone".
      page: 248,
      line: 23,
      wordIndices: [0],
      target: { book: "alma", chapter: 29, verse: 14 },
      note:
        "leading 'my' belongs to Alma 29:14 (starts 'my own success alone')",
    },
    {
      // PM p257:19 reads "...to transgression now of this thing..." — "now of
      // this" (indices 2–4) opens v20 canonically.
      page: 257,
      line: 19,
      wordRange: [2, 4],
      target: { book: "alma", chapter: 32, verse: 20 },
      note: "trailing 'now of this' belongs to Alma 32:20",
    },
    {
      // PM p266:33 reads "to time yea & he hath also brought our fathers out..."
      // — "yea & he hath also brought our fathers out" (indices 2–10) opens
      // v29 canonically.
      page: 266,
      line: 33,
      wordRange: [2, 10],
      target: { book: "alma", chapter: 36, verse: 29 },
      note:
        "trailing 'yea & he hath also brought our fathers out' belongs to Alma 36:29",
    },
    {
      // PM p273:34 reads "ured unto man therefore there is a time appointed unto
      // men that they shall rise" — "therefore there is a time appointed unto men
      // that they shall rise" (indices 3–14) opens v9 canonically.
      page: 273,
      line: 34,
      wordRange: [3, 14],
      target: { book: "alma", chapter: 40, verse: 9 },
      note:
        "trailing 'therefore there is a time appointed...' belongs to Alma 40:9",
    },
    {
      // PM p280:9 begins "thick clothing now the army of Zerahemnah..." — "thick
      // clothing" (indices 0–1) closes v19 canonically ("dressed with thick
      // clothing").
      page: 280,
      line: 9,
      wordRange: [0, 1],
      target: { book: "alma", chapter: 43, verse: 19 },
      note: "leading 'thick clothing' belongs to Alma 43:19",
    },
    {
      // PM p307:37 reads "...exceding heighth & this city became an exceding
      // strong hold ever after" — "& this city became an exceding strong hold
      // ever after" (indices 5–14) opens v5 canonically.
      page: 307,
      line: 37,
      wordRange: [5, 14],
      target: { book: "alma", chapter: 53, verse: 5 },
      note:
        "trailing '& this city became an exceding strong hold ever after' belongs to Alma 53:5",
    },
    {
      // PM p313:5 ends "...given to some of the La" — "La" (index 17) is the
      // first half of split word "Lamanite" and belongs to v31 with the prisoners.
      page: 313,
      line: 5,
      wordIndices: [17],
      target: { book: "alma", chapter: 55, verse: 31 },
      note:
        "'La' is first half of split word 'Lamanite', belongs to Alma 55:31",
    },
    {
      // PM p313:6 begins "manite prisoners & they were thus cautious..." —
      // "manite prisoners" (indices 0–1) completes "Lamanite prisoners" closing v31.
      page: 313,
      line: 6,
      wordRange: [0, 1],
      target: { book: "alma", chapter: 55, verse: 31 },
      note:
        "'manite prisoners' completes split word 'Lamanite prisoners', belongs to Alma 55:31",
    },
    {
      // PM p316:20 reads "...our Mothers knew & it came..." — "& it" (indices
      // 13–14) opens v49 canonically ("And it came to pass").
      page: 316,
      line: 20,
      wordRange: [13, 14],
      target: { book: "alma", chapter: 56, verse: 49 },
      note:
        "trailing '& it' belongs to Alma 56:49 (starts '& it came to pass')",
    },
    {
      // PM p317:17 reads "...city of Antiparah but I sent an Epistle" — "but
      // I sent an Epistle" (indices 11–15) opens v2 canonically.
      page: 317,
      line: 17,
      wordRange: [11, 15],
      target: { book: "alma", chapter: 57, verse: 2 },
      note: "trailing 'but I sent an Epistle' belongs to Alma 57:2",
    },
    {
      // PM p317:18 begins "unto the king that we were sure..." — "unto" (index
      // 0) is the object of "sent an Epistle unto" and belongs to v2.
      page: 317,
      line: 18,
      wordIndices: [0],
      target: { book: "alma", chapter: 57, verse: 2 },
      note:
        "leading 'unto' belongs to Alma 57:2 (completes 'sent an Epistle unto')",
    },
    {
      // PM p321:12 reads "the City & it came to pass on the morrow..." — "& it
      // came to pass" (indices 2–6) opens v14 canonically.
      page: 321,
      line: 12,
      wordRange: [2, 6],
      target: { book: "alma", chapter: 58, verse: 14 },
      note: "trailing '& it came to pass' belongs to Alma 58:14",
    },
    {
      // PM p329:30 ends "...Pahoron was restored to his Judgment" — "Judgment"
      // (index 13) belongs to v8 to complete "restored to his judgment-seat".
      page: 329,
      line: 30,
      wordIndices: [13],
      target: { book: "alma", chapter: 62, verse: 8 },
      note:
        "leading 'Judgment' belongs to Alma 62:8 (completes 'restored to his judgment')",
    },
    {
      // PM p329:31 begins "seat & the men of Pachus..." — "seat" (index 0)
      // completes "judgment seat" closing v8.
      page: 329,
      line: 31,
      wordIndices: [0],
      target: { book: "alma", chapter: 62, verse: 8 },
      note: "leading 'seat' belongs to Alma 62:8 (completes 'judgment seat')",
    },
  ],
};

export default pm;
