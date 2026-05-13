import { define } from "../utils/state.ts";

export const handler = define.handlers({
  GET(ctx) {
    return ctx.redirect("/witnesses/1");
  },
});

export default function Index() {
  return null;
}
