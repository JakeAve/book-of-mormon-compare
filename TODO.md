## Support rich text

Support either HTML or markdown to allow strike throughs, superscript, subscript
and other markings.

## Fix remaining markdown truncation cases in aligned data (9 cases)

These lines in the aligned JSON have `markdown` with fewer words than `text`
after stripping markup. Most are cross-line unclosed markers or raw data quirks.

| Version | File         | Line ID | Notes                                              |
| ------- | ------------ | ------- | -------------------------------------------------- |
| om      | enos/1.json  | 75:15   | Chapter header, unclosed `{{`                      |
| om      | alma/61.json | 187:1   | Unclosed `{{`, cuts off last word                  |
| om      | alma/57.json | 178:1   | Raw data mismatch (markdown has different content) |
| om      | alma/37.json | 126:30  | Missing first 2 words in markdown                  |
| om      | 3-ne/1.json  | 204:2   | Chapter header, unclosed `{{`                      |
| om      | jacob/7.json | 74:18   | Complex interleaved markup                         |
| om      | 2-ne/7.json  | 49:9    | Unclosed `}}`, cuts off last word                  |
| pm      | alma/20.json | 228:12  | Chapter header, leading `——`                       |
| pm      | alma/58.json | 323:16  | Chapter header, leading `——`                       |

## Organize supplementary texts

The intos to 1 Nephi, intro to Alma 5, all need to find a way to fit in verse
structure. Probably do 0 verses.

## Witnesses and title page

Populate the witnesses and title page

## Reference links

Add reference links to the sources

## Metadata

Each version should have a bit of metadata about the version like a short intro.
Not sure where that lives.

## Git hooks

Add pre commit hook that fmt, lint and unit test. Push will do all checks plus
e2e tests.

## Pretty Header

Add photos and nice data to headers for shareable links
