import { HttpError } from "fresh";
import { define } from "../../utils/state.ts";
import {
  getAdjacentChapters,
  getVersions,
  loadChapter,
} from "../../lib/data.ts";
import type { Verse } from "../../lib/data.ts";
import { DiffPage } from "../../components/DiffPage.tsx";
import VersionSelector from "../../islands/VersionSelector.tsx";
import WordMatchListener from "../../islands/WordMatchListener.tsx";
import TutorialDialog from "../../islands/TutorialDialog.tsx";

interface PageData {
  verses1: Verse[];
  verses2: Verse[];
  v1: string;
  v2: string;
  versions: string[];
  book: string;
  chapter: string;
  prev: { book: string; chapter: string } | null;
  next: { book: string; chapter: string } | null;
}

export const handler = define.handlers({
  async GET(ctx) {
    const { book, chapter } = ctx.params;
    const versions = await getVersions();

    if (versions.length === 0) throw new HttpError(404);

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

    return {
      data: {
        verses1,
        verses2,
        v1,
        v2,
        versions,
        book,
        chapter,
        prev: adjacent.prev,
        next: adjacent.next,
      } as PageData,
    };
  },
});

export default define.page<typeof handler>(({ data }) => {
  const { verses1, verses2, v1, v2, versions, book, chapter, prev, next } =
    data;
  return (
    <>
      <DiffPage
        verses1={verses1}
        verses2={verses2}
        select1={<VersionSelector side="v1" current={v1} versions={versions} />}
        select2={<VersionSelector side="v2" current={v2} versions={versions} />}
        book={book}
        chapter={chapter}
        prev={prev}
        next={next}
        v1={v1}
        v2={v2}
      />
      <WordMatchListener />
      <TutorialDialog />
    </>
  );
});
