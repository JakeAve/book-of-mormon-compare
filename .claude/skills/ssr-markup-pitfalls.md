---
name: ssr-markup-pitfalls
description: Use when emitting JSON-LD or structured data, adding head/meta tags, writing or reviewing server-rendered markup, or debugging why markup looks correct in the JSX but wrong in the served HTML. Covers Fresh 2 / Preact SSR traps that unit tests cannot catch. Triggers on "JSON-LD", "structured data", "schema.org", "rich results", "meta description", "og:", "renders wrong", "escaped HTML".
---

# SSR Markup Pitfalls

Every trap below produces JSX that reads correctly, passes `deno task check`,
and passes unit tests — while shipping broken HTML. They are only visible in
the **served output**.

The one rule that catches all of them: **assert against rendered HTML, not
against the object or props you passed in.**

## 1. JSON-LD must not be a text child

```tsx
// WRONG — ships {&quot;@context&quot;:&quot;https://schema.org&quot;…}
<script type="application/ld+json">{JSON.stringify(data)}</script>

// RIGHT
import { JsonLd } from "@/components/JsonLd.tsx";
<JsonLd data={data} />;
```

Preact HTML-escapes text children. Inside `<script>`, HTML character references
are **not** decoded (HTML5 "script data" state), so the literal script content
becomes `{&quot;…` — invalid JSON. Google's Rich Results Test reports a parsing
error and discards the block entirely.

This shipped undetected on this site for a long time: the `FAQPage` and
`BreadcrumbList` markup never worked. `lib/structuredData.test.ts` passed the
whole time, because asserting on the object literal cannot see the escaping.

`components/JsonLd.tsx` uses `dangerouslySetInnerHTML` and escapes `<` to
`<`, which neutralises `</script>`, `<script`, and `<!--` in any string
value. `JSON.stringify` never emits `<` outside string literals, so `<`
always round-trips. Verified: no XSS path, since every payload is
route-validated data.

## 2. `key` leaks content into the DOM

```tsx
// WRONG — Fresh serializes key into data-frsh-key, duplicating the whole
// sentence into an HTML attribute on every page
{paragraphs.map((text) => <p key={text}>{text}</p>)}

// RIGHT
{paragraphs.map((text, i) => <p key={i}>{text}</p>)}
```

Harmless-looking, but it emitted every book hub's differentiating prose twice —
once as content, once as an attribute.

## 3. `text-decoration` cannot be removed by a descendant

```tsx
// WRONG — no-underline does nothing; the count renders underlined
<a class="underline">
  <span>{name}</span>
  <span class="no-underline">{count}</span>
</a>;

// RIGHT — decorate the child that should be decorated
<a>
  <span class="underline">{name}</span>
  <span>{count}</span>
</a>;
```

`text-decoration` propagates from an ancestor to in-flow descendants and a
descendant cannot turn it off. Not Fresh-specific, but it hides well in JSX.

## 4. Route-shape regexes in `_app.tsx` go stale

`_app.tsx` once detected chapter pages with `/^\/[^/]+\/[^/]+/`. Adding
`/versions/{key}` silently matched it, putting a dead tutorial button on pages
with no `TutorialDialog` mounted.

Prefer an explicit signal from the route (`ctx.state.showTutorial`) over
inferring page type from URL shape — adding a route should not require
remembering to audit regexes in the shell.

## 5. Never `.slice()` a user-facing string to fit a budget

It truncates mid-word, and the same string feeds `og:`/`twitter:` tags where
nothing clips gracefully. Build the full form; if it exceeds the budget, return
a shorter **complete** alternative. See `chapterTitle`, `chapterDescription`,
`bookDescription`, `versionPageTitle` in `lib/`.

Google truncates by pixel width anyway (~600px titles, ~920px descriptions), so
the character caps are proxies, not hard limits — a mid-word stub in your own
HTML is strictly worse than letting Google clip a complete sentence.

## Verifying

Run the dev server on a free port (5173 may be occupied), then check the
**served** HTML:

```bash
# every JSON-LD block on a page must parse
curl -s "http://127.0.0.1:5173/alma" \
  | grep -o '<script[^>]*ld+json[^>]*>[^<]*' \
  | sed 's/.*>//' \
  | while read -r b; do echo "$b" | python3 -m json.tool >/dev/null \
      && echo OK || echo FAIL; done

# is the markup actually in the SSR output, not just added by an island?
curl -s "http://127.0.0.1:5173/1-ne/4?v1=pm&v2=2013" | grep -c 'href="/1-ne"'
```

Content inside `<dialog>` in this repo **is** server-rendered — the jump-to-
chapter dialog emits 243 crawlable chapter links — so a link there is as
indexable as one in the page body. Confirm rather than assume, either way.

For anything layout- or contrast-dependent, measure in a real browser instead
of reasoning from the CSS. `getBoundingClientRect()` for geometry;
`getComputedStyle()` plus a WCAG ratio for contrast. See
`VERSE_SCROLL_MARGIN_TOP` in `components/Diff.tsx`, which is coupled to the
sticky header's rendered height and must be re-measured whenever that header
changes.

## Writing the test

A test that would have caught #1 renders the component and parses the result:

```ts
import { render } from "preact-render-to-string";

const html = render(JsonLd({ data: { "@type": "Thing", name: "a < b" } }));
const body = html.match(/<script[^>]*>([\s\S]*?)<\/script>/)![1];
JSON.parse(body); // throws if escaped
```

Cover a payload containing `<` and one containing the literal `</script>`.
