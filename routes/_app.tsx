import type { PageProps } from "fresh";
import type { State } from "@/utils/state.ts";
import Footer from "@/components/Footer.tsx";
import Header from "@/components/Header.tsx";
import BetaBanner from "@/components/BetaBanner.tsx";
import ScrollRestorer from "@/islands/ScrollRestorer.tsx";

export default function App({ Component, state }: PageProps<unknown, State>) {
  const head = state.head;
  const title = head?.title ?? "Book of Mormon Compare";
  const description = head?.description ??
    "Side-by-side textual comparison of Book of Mormon manuscripts and editions";

  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{title}</title>
        <link rel="icon" type="image/svg+xml" href="/logo.svg" />
        <meta name="description" content={description} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        {head && (
          <>
            <meta property="og:url" content={head.pageUrl} />
            <meta property="og:image" content={head.imageUrl} />
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content={title} />
            <meta name="twitter:description" content={description} />
            <meta name="twitter:image" content={head.imageUrl} />
          </>
        )}
      </head>
      <body
        class="flex flex-col min-h-screen"
        style={{ backgroundColor: "var(--color-page-bg)" }}
      >
        <Header />
        <BetaBanner />
        <Component />
        <Footer />
        <ScrollRestorer />
      </body>
    </html>
  );
}
