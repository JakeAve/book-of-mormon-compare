import { HttpError } from "fresh";
import { define } from "../../utils/state.ts";
import { getVersions, loadChapter } from "../../lib/data.ts";
import type { Verse } from "../../lib/data.ts";
import { DiffPage } from "../../components/DiffPage.tsx";
import VersionSelector from "../../islands/VersionSelector.tsx";
import WordMatchListener from "../../islands/WordMatchListener.tsx";

interface PageData {
  verses1: Verse[];
  verses2: Verse[];
  v1: string;
  v2: string;
  versions: string[];
}

export const handler = define.handlers({
  async GET(ctx) {
    const { book, chapter } = ctx.params;
    const versions = await getVersions();

    if (versions.length === 0) throw new HttpError(404);

    const params = new URLSearchParams(ctx.url.searchParams);
    let needsRedirect = false;
    if (!params.has("v1")) { params.set("v1", versions[0]); needsRedirect = true; }
    if (!params.has("v2")) { params.set("v2", versions[0]); needsRedirect = true; }
    if (needsRedirect) return ctx.redirect(`/${book}/${chapter}?${params}`);

    const v1 = params.get("v1")!;
    const v2 = params.get("v2")!;

    if (!versions.includes(v1) || !versions.includes(v2)) throw new HttpError(404);

    try {
      const [verses1, verses2] = await Promise.all([
        loadChapter(v1, book, chapter),
        loadChapter(v2, book, chapter),
      ]);
      return { data: { verses1, verses2, v1, v2, versions } as PageData };
    } catch {
      throw new HttpError(404);
    }
  },
});

export default define.page<typeof handler>(({ data }) => {
  const { verses1, verses2, v1, v2, versions } = data;
  return (
    <>
      <DiffPage
        verses1={verses1}
        verses2={verses2}
        header1={<VersionSelector side="v1" current={v1} versions={versions} />}
        header2={<VersionSelector side="v2" current={v2} versions={versions} />}
      />
      <WordMatchListener />
    </>
  );
});
