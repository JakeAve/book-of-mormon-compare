import { assertEquals } from "@std/assert";
import { headingToBook } from "./headings.ts";

Deno.test("headingToBook - 4 Nephi's 'disciples of Jesus Christ' wins over the 3 Nephi son-of-nephi rule", () => {
  assertEquals(
    headingToBook(
      "the book of nephi who is the son of nephi one of the disciples of jesus christ",
    ),
    "4-ne",
  );
  assertEquals(
    headingToBook(
      "the book of nephi the son of nephi who was the son of helaman",
    ),
    "3-ne",
  );
});
