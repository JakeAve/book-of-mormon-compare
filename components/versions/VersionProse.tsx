import type { VNode } from "preact";

export const VERSION_PROSE: Record<string, () => VNode> = {
  "om": () => (
    <>
      <p>
        Dictated in 1829 by Joseph Smith to a rotating group of scribes,
        primarily Oliver Cowdery. It is the closest surviving witness to the
        dictation text, preserving spellings, readings, and word choices not
        present in any later witness.
      </p>
      <p>
        In 1841 Joseph Smith placed the manuscript in the cornerstone of the
        Nauvoo House. The seal eventually broke, exposing the pages to moisture
        and mold. When Lewis Bidamon — Emma Smith's second husband — renovated
        the building in 1882, he found the manuscript severely damaged. Of the
        nearly 500 original pages, portions of only 232 survived (roughly 28%
        total). Bidamon distributed the remaining pages to visitors and
        missionaries as souvenirs. Most extant fragments were eventually
        consolidated at the Church History Library, Salt Lake City, where they
        have been transcribed by Royal Skousen as part of the Critical Text
        Project.
      </p>
    </>
  ),
  "pm": () => (
    <>
      <p>
        Transcribed from the Original Manuscript by Oliver Cowdery in 1829-1830.
        Nearly 100% extant. It served as the compositor's copy for the 1830
        first edition, except for portions where pages of the Original
        Manuscript were delivered directly to the printer. As the most complete
        early manuscript witness, the PM is the foundation of most critical text
        work. Transcription errors introduced during copying — and corrections
        made by Cowdery and others — are visible when compared against the
        Original Manuscript.
      </p>
      <p>
        After printing, Cowdery retained the manuscript. Before his death in
        1850 he passed it to fellow witness and brother-in-law David Whitmer,
        whose family preserved it until Whitmer's grandson sold it to the
        Reorganized Church of Jesus Christ of Latter Day Saints (now Community
        of Christ) in 1903 for $2,500. The Church of Jesus Christ of Latter-day
        Saints purchased it in 2017 for $35 million; it is now held at the
        Church History Library, Salt Lake City.
      </p>
    </>
  ),
  "1830": () => (
    <>
      <p>
        Typeset from the Printer's Manuscript (and portions of the Original
        Manuscript) and published by E.B. Grandin in Palmyra, New York, with a
        first print run of approximately 5,000 copies. The first several
        printings, including the 1830 edition, have no versification; the text
        is divided into large narrative chapters with no further subdivision.
      </p>
      <p>
        The typesetting process introduced a new layer of variation: compositor
        changes, house-style normalization, and a small number of editorial
        interventions. Comparing the 1830 edition against the manuscripts
        reveals this layer directly. Not all 1830 editions are identical because
        deviations were caught and corrected during the printing process after
        some leafs were already printed. The 1830 edition in this project is
        sourced from the transcription made available by the{" "}
        <a
          target="_blank"
          href="https://www.josephsmithpapers.org/paper-summary/book-of-mormon-1830/1"
          rel="noopener noreferrer"
          class="underline"
        >
          Joseph Smith Paper's project on document ID 7272.
        </a>
      </p>
    </>
  ),
  "1837": () => (
    <>
      <p>
        Published in Kirtland, Ohio. Joseph Smith personally supervised
        approximately 3,000 emendations, the large majority of which are
        grammatical and syntactic — regularizing non-standard verb forms,
        pronoun agreements, and other constructions present in the dictation
        text. A smaller set of changes carries semantic or theological weight
        and has received considerable scholarly attention.
      </p>
      <p>
        The 1837 edition in this project is sourced from the transcription made
        available by the{" "}
        <a
          target="_blank"
          href="https://www.josephsmithpapers.org/paper-summary/book-of-mormon-1837/1"
          rel="noopener noreferrer"
          class="underline"
        >
          Joseph Smith Paper's project on document ID 7273.
        </a>
      </p>
    </>
  ),
  "1840": () => (
    <>
      <p>
        The third edition, printed at the Cincinnati firm of Shepard & Stearns
        under the direction of Ebenezer Robinson. Unlike the largely grammatical
        1837 revision, Joseph Smith personally compared the 1830 and 1837
        printings against the Original Manuscript for this edition, restoring
        readings lost when the Printer's Manuscript was copied and correcting
        further compositor errors accumulated over two printings. The most
        notable resulting change corrected the description of the Nephites from
        "white and delightsome" to "pure and delightsome."
      </p>
      <p>
        After heavily relying on the Original Manuscript for this edition,
        Joseph Smith placed the manuscript in the cornerstone of the Nauvoo
        House on October 2, 1841. Unfortunately it suffered significant water
        damage by the time it was recovered.
      </p>
      <p>
        The 1840 edition in this project is sourced from the images made
        available by the{" "}
        <a
          target="_blank"
          href="https://www.josephsmithpapers.org/paper-summary/book-of-mormon-1840/1"
          rel="noopener noreferrer"
          class="underline"
        >
          Joseph Smith Paper's project on document ID 7274.
        </a>
      </p>
    </>
  ),
  "1841": () => (
    <>
      <p>
        The first edition published outside the United States, printed in
        Liverpool for Brigham Young, Heber C. Kimball, and Parley P. Pratt
        during the apostles' mission to England. Because copies of the 1840
        Nauvoo edition had not reached England, it was typeset from a copy of
        the 1837 edition, so it carries the 1837 text — without Joseph Smith's
        1840 corrections against the Original Manuscript — with a fresh layer of
        British compositor changes.
      </p>
      <p>
        Five thousand copies were printed, making it the largest single printing
        of the Book of Mormon up to that time and the edition that served the
        rapidly growing British mission.
      </p>
      <p>
        The 1841 edition in this project is sourced from the images made
        available by the{" "}
        <a
          target="_blank"
          href="https://www.josephsmithpapers.org/paper-summary/book-of-mormon-1841/1"
          rel="noopener noreferrer"
          class="underline"
        >
          Joseph Smith Paper's project on document ID 7527.
        </a>
      </p>
    </>
  ),
  "2013": () => (
    <>
      <p>
        The current edition published by The Church of Jesus Christ of
        Latter-day Saints. Descended from the 1837 edition through subsequent
        revisions in 1840, 1879, 1920, 1981, and 2013. The most common witness
        printed and read today.
      </p>
    </>
  ),
};
