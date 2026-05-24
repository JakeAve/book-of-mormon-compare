import { define } from "@/utils/state.ts";
import { getSiteUrl } from "@/lib/config.ts";
import CachedPagesList from "@/islands/CachedPagesList.tsx";

export const handler = define.handlers({
  GET(ctx) {
    const siteUrl = getSiteUrl();
    ctx.state.head = {
      title: "Offline — Book of Mormon Compare",
      description:
        "You're offline. View pages you've already loaded in Book of Mormon Compare.",
      imageUrl: `${siteUrl}/og-image?book=1-ne&chapter=1&v1=pm&v2=2013`,
      pageUrl: `${siteUrl}/offline`,
      canonicalUrl: `${siteUrl}/offline`,
    };
    return { data: {} };
  },
});

export default define.page<typeof handler>(() => {
  return (
    <main
      class="flex flex-col gap-6 max-w-2xl mx-auto px-6 pt-10 pb-16 font-serif text-base leading-relaxed"
      style={{ color: "var(--color-text)" }}
    >
      <header class="flex flex-col gap-2">
        <h1 class="text-3xl font-semibold">You're offline</h1>
        <p style={{ opacity: 0.8 }}>
          Here are the pages you've already loaded — they'll work without a
          connection.
        </p>
      </header>
      <div data-offline-fallback hidden />
      <CachedPagesList />
    </main>
  );
});
