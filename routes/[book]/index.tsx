import { HttpError } from "fresh";
import { define } from "../../utils/state.ts";

const CHAPTERLESS_BOOKS = new Set(["witnesses", "title-page"]);

export const handler = define.handlers({
  GET(ctx) {
    const { book } = ctx.params;
    if (!CHAPTERLESS_BOOKS.has(book)) throw new HttpError(404);
    const qs = ctx.url.search;
    return ctx.redirect(`/${book}/1${qs}`);
  },
});
