import { define } from "@/utils/state.ts";
import { getSiteUrl } from "@/lib/config.ts";
import { getVersionDisplayName, loadChapter } from "@/lib/data.ts";
import { stripManuscriptMarkup } from "@/lib/manuscriptMarkup.ts";
import Hero from "@/components/landing/Hero.tsx";
import Specimen from "@/components/landing/Specimen.tsx";
import Divider from "@/components/landing/Divider.tsx";
import WitnessTimeline from "@/components/landing/WitnessTimeline.tsx";
import HowItWorks from "@/components/landing/HowItWorks.tsx";
import SeoSections from "@/components/landing/SeoSections.tsx";
import Faq, { FAQ_ITEMS } from "@/components/landing/Faq.tsx";

const SPECIMEN_BOOK = "3-ne";
const SPECIMEN_CHAPTER = "11";
const SPECIMEN_VERSE = 11;
const SPECIMEN_V1 = "pm";
const SPECIMEN_V2 = "2013";

export const handler = define.handlers({
  async GET(ctx) {
    const siteUrl = getSiteUrl();
    ctx.state.head = {
      title:
        "Book of Mormon Changes — Compare Versions & Editions Side by Side",
      description:
        "See every change to the Book of Mormon, side by side. Compare manuscripts, the 1830 first edition, and every later edition — word for word.",
      imageUrl:
        `${siteUrl}/og-image?book=${SPECIMEN_BOOK}&chapter=${SPECIMEN_CHAPTER}&v1=${SPECIMEN_V1}&v2=${SPECIMEN_V2}`,
      pageUrl: `${siteUrl}/`,
      canonicalUrl: `${siteUrl}/`,
    };

    const [verses1, verses2] = await Promise.all([
      loadChapter(SPECIMEN_V1, SPECIMEN_BOOK, SPECIMEN_CHAPTER),
      loadChapter(SPECIMEN_V2, SPECIMEN_BOOK, SPECIMEN_CHAPTER),
    ]);
    const verse1 = verses1.find((v) => v.verse === SPECIMEN_VERSE);
    const verse2 = verses2.find((v) => v.verse === SPECIMEN_VERSE);

    return {
      data: {
        text1: verse1
          ? stripManuscriptMarkup(verse1.markdown ?? verse1.text)
          : "",
        text2: verse2
          ? stripManuscriptMarkup(verse2.markdown ?? verse2.text)
          : "",
      },
    };
  },
});

export default define.page<typeof handler>(({ data }) => {
  const siteUrl = getSiteUrl();
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "name": "Book of Mormon Compare",
        "url": `${siteUrl}/`,
      },
      {
        "@type": "FAQPage",
        "mainEntity": FAQ_ITEMS.map((item) => ({
          "@type": "Question",
          "name": item.question,
          "acceptedAnswer": {
            "@type": "Answer",
            "text": item.answer,
          },
        })),
      },
    ],
  };

  return (
    <main class="flex flex-col">
      <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      <Hero />
      <Divider />
      <Specimen
        reference={`3 Nephi ${SPECIMEN_CHAPTER}:${SPECIMEN_VERSE}`}
        href={`/${SPECIMEN_BOOK}/${SPECIMEN_CHAPTER}?v1=${SPECIMEN_V1}&v2=${SPECIMEN_V2}#v-${SPECIMEN_VERSE}`}
        v1Label={getVersionDisplayName(SPECIMEN_V1)}
        v2Label={getVersionDisplayName(SPECIMEN_V2)}
        text1={data.text1}
        text2={data.text2}
      />
      <Divider />
      <WitnessTimeline />
      <Divider />
      <HowItWorks />
      <Divider />
      <SeoSections />
      <Divider />
      <Faq />
      <Divider />
      <div class="px-6 py-12 sm:py-16 text-center">
        <h2
          class="landing-display text-3xl sm:text-4xl mb-4"
          style={{ color: "var(--color-text)" }}
        >
          See it for yourself
        </h2>
        <a
          href="/witnesses/1"
          class="inline-block font-serif text-base sm:text-lg px-7 py-3 rounded-sm"
          style={{
            backgroundColor: "var(--color-chip-active-bg)",
            color: "var(--color-chip-active-fg)",
          }}
        >
          Start comparing →
        </a>
      </div>
    </main>
  );
});
