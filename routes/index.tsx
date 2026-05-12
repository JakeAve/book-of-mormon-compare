import { define } from "../utils/state.ts";

export const handler = define.handlers({
  GET(ctx) {
    return ctx.redirect("/title-page/1");
  },
});

export default function Index() {
  return <></>;
}
