import { HttpError } from "fresh";
import { define } from "@/utils/state.ts";
import { getSiteUrl } from "@/lib/config.ts";
import { buildBreadcrumbList } from "@/lib/breadcrumbs.ts";
import { buildArticle } from "@/lib/structuredData.ts";
import { JsonLd } from "@/components/JsonLd.tsx";
import {
  getVersionInfo,
  type VersionInfo,
  versionPageTitle,
} from "@/lib/versionInfo.ts";
import { VERSION_PROSE } from "@/components/versions/VersionProse.tsx";

export const handler = define.handlers({
  GET(ctx) {
    const info = getVersionInfo(ctx.params.key);
    if (!info || !VERSION_PROSE[info.key]) throw new HttpError(404);

    const siteUrl = getSiteUrl();
    ctx.state.head = {
      title: versionPageTitle(info),
      description: info.summary,
      imageUrl: `${siteUrl}/og-default.png`,
      pageUrl: `${siteUrl}/versions/${info.key}`,
      canonicalUrl: `${siteUrl}/versions/${info.key}`,
    };

    return { data: { info } as { info: VersionInfo } };
  },
});

export default define.page<typeof handler>(({ data }) => {
  const { info } = data;
  const siteUrl = getSiteUrl();
  const Prose = VERSION_PROSE[info.key];
  const breadcrumb = buildBreadcrumbList([
    { name: "Home", url: `${siteUrl}/` },
    { name: "Versions", url: `${siteUrl}/versions` },
    { name: info.name, url: `${siteUrl}/versions/${info.key}` },
  ]);
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      buildArticle({
        headline: info.name,
        description: info.summary,
        url: `${siteUrl}/versions/${info.key}`,
        siteUrl,
      }),
      {
        "@type": "BreadcrumbList",
        "itemListElement": breadcrumb.itemListElement,
      },
    ],
  };

  return (
    <main
      class="flex flex-col gap-6 max-w-2xl mx-auto px-6 pt-10 pb-16 font-serif text-base leading-relaxed"
      style={{ color: "var(--color-text)" }}
    >
      <JsonLd data={jsonLd} />
      <h1 class="text-3xl font-semibold">{info.name}</h1>
      <Prose />
      <p>
        <a href={info.compareHref} class="underline">
          Compare {info.shortName} →
        </a>
      </p>
      <p>
        <a href="/versions" class="underline">All witnesses →</a>
      </p>
    </main>
  );
});
