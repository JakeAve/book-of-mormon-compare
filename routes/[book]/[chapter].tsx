import { HttpError } from "fresh";
import { define } from "../../utils/state.ts";
import {
  getAdjacentChapters,
  getBookDisplayName,
  getVersionDisplayName,
  getVersions,
  loadChapter,
} from "../../lib/data.ts";
import type { Verse } from "../../lib/data.ts";
import { getSiteUrl } from "../../lib/config.ts";
import { buildBreadcrumbList } from "../../lib/breadcrumbs.ts";
import { parseMarkParam, serializeMarkParam } from "../../lib/verseMark.ts";
import {
  chapterDescription,
  chapterSummarySentence,
  chapterTitle,
  isCanonicalPair,
  loadVariantStats,
} from "../../lib/variantStats.ts";
import { DiffPage } from "../../components/DiffPage.tsx";
import VersionSelector from "../../islands/VersionSelector.tsx";
import WordMatchListener from "../../islands/WordMatchListener.tsx";
import SelectionMenu from "../../islands/SelectionMenu.tsx";
import ReportDialog from "../../islands/ReportDialog.tsx";
import TutorialDialog from "../../islands/TutorialDialog.tsx";
import SwipeNavigator from "../../islands/SwipeNavigator.tsx";

interface PageData {
  verses1: Verse[];
  verses2: Verse[];
  v1: string;
  v2: string;
  versions: string[];
  book: string;
  chapter: string;
  bookName: string;
  v1Display: string;
  v2Display: string;
  prev: { book: string; chapter: string } | null;
  next: { book: string; chapter: string } | null;
  markedVerses: Set<number> | null;
  summary: string | null;
}

export const handler = define.handlers({
  async GET(ctx) {
    const { book, chapter } = ctx.params;
    const versions = await getVersions();

    if (versions.length === 0) {
      throw new HttpError(404);
    }

    const params = new URLSearchParams(ctx.url.searchParams);
    const defaultV1 = versions.includes("pm") ? "pm" : versions[0];
    const defaultV2 = versions.includes("2013") ? "2013" : versions[0];
    let needsRedirect = false;
    if (!params.has("v1")) {
      params.set("v1", defaultV1);
      needsRedirect = true;
    }
    if (!params.has("v2")) {
      params.set("v2", defaultV2);
      needsRedirect = true;
    }
    if (needsRedirect) return ctx.redirect(`/${book}/${chapter}?${params}`);

    const v1 = params.get("v1")!;
    const v2 = params.get("v2")!;
    const markedVerses = parseMarkParam(params.get("mark"));

    if (!versions.includes(v1) || !versions.includes(v2)) {
      throw new HttpError(404);
    }

    const [verses1, verses2, adjacent] = await Promise.all([
      loadChapter(v1, book, chapter),
      loadChapter(v2, book, chapter),
      getAdjacentChapters(v1, book, chapter),
    ]);

    if (verses1.length === 0 && verses2.length === 0) {
      throw new HttpError(404);
    }

    const bookName = getBookDisplayName(book);
    const siteUrl = getSiteUrl();
    const v1Display = getVersionDisplayName(v1);
    const v2Display = getVersionDisplayName(v2);

    const stats = isCanonicalPair(v1, v2)
      ? (await loadVariantStats()).forChapter(book, chapter)
      : null;

    const genericTitle =
      `${bookName} Chapter ${chapter} — Book of Mormon Compare`;
    const title = stats ? chapterTitle(stats, bookName) : (
      genericTitle.length <= 60
        ? genericTitle
        : `${bookName} Ch. ${chapter} — Book of Mormon Compare`.slice(0, 60)
    );
    const description = stats
      ? chapterDescription(stats, bookName)
      : `Side-by-side comparison of ${v1Display} and ${v2Display}`.slice(
        0,
        155,
      );
    const summary = stats ? chapterSummarySentence(stats) : null;

    ctx.state.head = {
      title,
      description,
      imageUrl: `${siteUrl}/og-image?book=${encodeURIComponent(book)}&chapter=${
        encodeURIComponent(chapter)
      }&v1=${encodeURIComponent(v1)}&v2=${encodeURIComponent(v2)}${
        markedVerses && markedVerses.size > 0
          ? `&mark=${encodeURIComponent(serializeMarkParam(markedVerses))}`
          : ""
      }`,
      pageUrl: `${siteUrl}/${book}/${chapter}?v1=${encodeURIComponent(v1)}&v2=${
        encodeURIComponent(v2)
      }`,
      canonicalUrl: `${siteUrl}/${book}/${chapter}?v1=pm&v2=2013`,
    };

    return {
      data: {
        verses1,
        verses2,
        v1,
        v2,
        versions,
        book,
        chapter,
        bookName,
        v1Display,
        v2Display,
        prev: adjacent.prev,
        next: adjacent.next,
        markedVerses,
        summary,
      } as PageData,
    };
  },
});

export default define.page<typeof handler>(({ data }) => {
  const {
    verses1,
    verses2,
    v1,
    v2,
    versions,
    book,
    chapter,
    bookName,
    v1Display,
    v2Display,
    prev,
    next,
    markedVerses,
    summary,
  } = data;
  const qs = `?v1=${encodeURIComponent(v1)}&v2=${encodeURIComponent(v2)}`;
  const prevHref = prev ? `/${prev.book}/${prev.chapter}${qs}` : null;
  const nextHref = next ? `/${next.book}/${next.chapter}${qs}` : null;
  const siteUrl = getSiteUrl();
  const jsonLd = buildBreadcrumbList([
    { name: "Home", url: `${siteUrl}/` },
    { name: bookName, url: `${siteUrl}/${book}/1${qs}` },
    { name: `Chapter ${chapter}`, url: `${siteUrl}/${book}/${chapter}${qs}` },
  ]);
  return (
    <>
      <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      <DiffPage
        verses1={verses1}
        verses2={verses2}
        select1={<VersionSelector side="v1" current={v1} versions={versions} />}
        select2={<VersionSelector side="v2" current={v2} versions={versions} />}
        book={book}
        chapter={chapter}
        bookName={bookName}
        v1Display={v1Display}
        v2Display={v2Display}
        prev={prev}
        next={next}
        v1={v1}
        v2={v2}
        markedVerses={markedVerses}
        summary={summary ?? undefined}
      />
      <WordMatchListener />
      <SelectionMenu book={book} chapter={chapter} v1={v1} v2={v2} />
      <ReportDialog book={book} chapter={chapter} v1={v1} v2={v2} />
      <TutorialDialog />
      <SwipeNavigator prevHref={prevHref} nextHref={nextHref} />
    </>
  );
});
