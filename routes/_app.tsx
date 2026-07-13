import type { PageProps } from "fresh";
import type { State } from "@/utils/state.ts";
import { getSiteUrl } from "@/lib/config.ts";
import Footer from "@/components/Footer.tsx";
import Header from "@/components/Header.tsx";
import ScrollRestorer from "@/islands/ScrollRestorer.tsx";
import Toast from "@/islands/Toast.tsx";
import PwaManager from "@/islands/PwaManager.tsx";

export default function App(
  { Component, state, url }: PageProps<unknown, State>,
) {
  const head = state.head;
  const siteUrl = getSiteUrl();
  const title = head?.title ?? "Book of Mormon Compare";
  const description = head?.description ??
    "Side-by-side textual comparison of Book of Mormon manuscripts and editions";
  const imageUrl = head?.imageUrl ?? `${siteUrl}/og-default.png`;
  const pageUrl = head?.pageUrl ?? new URL(url.pathname, siteUrl).href;

  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{title}</title>
        <link rel="icon" type="image/svg+xml" href="/logo.svg" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="theme-color" content="#f4f0e8" />
        <meta name="description" content={description} />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Book of Mormon Compare" />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={pageUrl} />
        <meta property="og:image" content={imageUrl} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content={imageUrl} />
        {head?.canonicalUrl && (
          <link
            rel="canonical"
            href={head.canonicalUrl}
          />
        )}
      </head>
      <body
        class="flex flex-col min-h-screen"
        style={{ backgroundColor: "var(--color-page-bg)" }}
      >
        <Header />
        <Component />
        <Footer />
        <ScrollRestorer />
        <Toast />
        <PwaManager />
      </body>
    </html>
  );
}
