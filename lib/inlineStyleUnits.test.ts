import { assertEquals } from "@std/assert";

/**
 * Deno's `jsx: precompile` transform serializes static elements through
 * preact/jsx-runtime's `jsxAttr`, which hyphenates the style property BEFORE
 * testing preact's `IS_NON_DIMENSIONAL` regex. Unitless properties whose
 * hyphenated name no longer matches that regex get a bogus `px` suffix
 * (`font-weight:600px`), which browsers discard. Tags in
 * `jsxPrecompileSkipElements` escape it — they go through
 * preact-render-to-string, which uses a correct lookup table.
 *
 * The list below is the properties this repo actually uses; the full set of
 * affected properties is larger (`tabSize`, `aspectRatio`, `scale`, …).
 */
const BROKEN_UNITLESS = ["fontWeight", "lineHeight", "flexGrow", "flexShrink"];

const PATTERN = new RegExp(
  `\\b(${BROKEN_UNITLESS.join("|")}):\\s*-?\\d`,
);

async function* sourceFiles(dir: string): AsyncGenerator<string> {
  for await (const entry of Deno.readDir(dir)) {
    const path = `${dir}/${entry.name}`;
    if (entry.isDirectory) yield* sourceFiles(path);
    else if (path.endsWith(".tsx") || path.endsWith(".ts")) yield path;
  }
}

Deno.test("no numeric values for unitless inline style properties", async () => {
  const offenders: string[] = [];
  for (const dir of ["components", "islands", "routes"]) {
    for await (const path of sourceFiles(dir)) {
      const text = await Deno.readTextFile(path);
      text.split("\n").forEach((line, i) => {
        if (PATTERN.test(line)) {
          offenders.push(`${path}:${i + 1}: ${line.trim()}`);
        }
      });
    }
  }
  assertEquals(
    offenders,
    [],
    `Quote these values — SSR appends "px" and the browser drops the declaration:\n${
      offenders.join("\n")
    }`,
  );
});
