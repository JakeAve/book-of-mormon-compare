import { assertEquals } from "@std/assert";
import { getVersionInfo, VERSION_INFO } from "./versionInfo.ts";
import { VERSION_DISPLAY_NAMES, VERSION_ORDER } from "./data.ts";

Deno.test("every version in VERSION_ORDER has info", () => {
  for (const key of VERSION_ORDER) {
    const info = VERSION_INFO[key];
    assertEquals(typeof info, "object", `missing info for ${key}`);
    assertEquals(info.key, key);
    assertEquals(info.name, VERSION_DISPLAY_NAMES[key]);
    assertEquals(info.summary.length > 40, true, `summary too thin for ${key}`);
    assertEquals(
      info.summary.length <= 155,
      true,
      `summary too long for ${key}`,
    );
    assertEquals(info.compareHref.startsWith("/"), true);
    assertEquals(info.compareHref.includes(key), true);
  }
});

Deno.test("summaries are distinct", () => {
  const summaries = VERSION_ORDER.map((key) => VERSION_INFO[key].summary);
  assertEquals(new Set(summaries).size, summaries.length);
});

Deno.test("getVersionInfo rejects unknown keys", () => {
  assertEquals(getVersionInfo("om")?.key, "om");
  assertEquals(getVersionInfo("1611"), null);
});
