import { define } from "../utils/state.ts";

export const handler = define.handlers({
  GET(ctx) {
    return ctx.redirect("/1-ne/1");
  },
});

export default function Index() {
  return <></>;
}
