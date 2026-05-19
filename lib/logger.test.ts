import { assertEquals } from "@std/assert";
import { log } from "./logger.ts";

Deno.test("log info emits JSON to console.log", () => {
  const lines: string[] = [];
  const orig = console.log;
  console.log = (s: string) => lines.push(s);
  try {
    log("info", "page_view", { book: "1-ne", chapter: "1" });
  } finally {
    console.log = orig;
  }
  assertEquals(lines.length, 1);
  const parsed = JSON.parse(lines[0]);
  assertEquals(parsed.level, "info");
  assertEquals(parsed.event, "page_view");
  assertEquals(parsed.book, "1-ne");
  assertEquals(parsed.chapter, "1");
  assertEquals(typeof parsed.ts, "string");
});

Deno.test("log error emits JSON to console.error", () => {
  const lines: string[] = [];
  const orig = console.error;
  console.error = (s: string) => lines.push(s);
  try {
    log("error", "load_chapter_error", { error: "boom" });
  } finally {
    console.error = orig;
  }
  assertEquals(lines.length, 1);
  const parsed = JSON.parse(lines[0]);
  assertEquals(parsed.level, "error");
  assertEquals(parsed.event, "load_chapter_error");
  assertEquals(parsed.error, "boom");
});

Deno.test("log warn emits JSON to console.log", () => {
  const lines: string[] = [];
  const orig = console.log;
  console.log = (s: string) => lines.push(s);
  try {
    log("warn", "not_found", { book: "alma", chapter: "99" });
  } finally {
    console.log = orig;
  }
  assertEquals(lines.length, 1);
  const parsed = JSON.parse(lines[0]);
  assertEquals(parsed.level, "warn");
  assertEquals(parsed.event, "not_found");
});

Deno.test("log with no fields emits valid JSON", () => {
  const lines: string[] = [];
  const orig = console.log;
  console.log = (s: string) => lines.push(s);
  try {
    log("info", "ping");
  } finally {
    console.log = orig;
  }
  const parsed = JSON.parse(lines[0]);
  assertEquals(parsed.level, "info");
  assertEquals(parsed.event, "ping");
});
