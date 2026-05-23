import { useEffect, useState } from "preact/hooks";
import {
  type CachedGroup,
  groupCachedNavigations,
} from "@/lib/cachedNavigations.ts";
import {
  BOOK_DISPLAY_NAMES,
  isBookAbbr,
  VERSION_DISPLAY_NAMES,
} from "@/lib/data.ts";

const NAVIGATION_CACHE = "navigation-cache";

function displayVersion(v: string): string {
  return VERSION_DISPLAY_NAMES[v] ?? v;
}

function displayBook(book: string): string {
  return isBookAbbr(book) ? BOOK_DISPLAY_NAMES[book] : book;
}

export default function CachedPagesList() {
  const [groups, setGroups] = useState<CachedGroup[] | null>(null);

  useEffect(() => {
    globalThis.dispatchEvent(new CustomEvent("pwa-offline-fallback"));

    if (!("caches" in globalThis)) {
      setGroups([]);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const cache = await caches.open(NAVIGATION_CACHE);
        const requests = await cache.keys();
        const hrefs = requests.map((r) => r.url);
        if (cancelled) return;
        setGroups(groupCachedNavigations(hrefs));
      } catch {
        if (!cancelled) setGroups([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (groups === null) return null;

  if (groups.length === 0) {
    return (
      <p
        class="font-serif"
        style={{ color: "var(--color-text)", opacity: 0.8 }}
      >
        You're offline and no pages are cached yet. Reconnect to load a chapter,
        and it'll be available offline next time.
      </p>
    );
  }

  return (
    <div class="flex flex-col gap-6">
      {groups.map((group) => (
        <section
          key={`${group.v1}-${group.v2}`}
          class="flex flex-col gap-2"
        >
          <h2 class="text-lg font-semibold">
            {displayVersion(group.v1)} ↔ {displayVersion(group.v2)}
          </h2>
          <ul class="flex flex-col gap-1 pl-4">
            {group.entries.map((entry) => (
              <li key={entry.href}>
                <a class="underline" href={entry.href}>
                  {displayBook(entry.book)} {entry.chapter}
                </a>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
