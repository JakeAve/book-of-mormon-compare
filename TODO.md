## Metadata

Each version should have a bit of metadata about the version like a short intro.
Not sure where that lives.

## Load Times

Find a way to decrease cpu time for DiffPages

- We could pretokenize diffs in generated files or KV - would get very big
- We could set up the diff to run at verse level once the verses are completely
  aligned, probably the simplest way
- We could sort of memcache in KV - also would get big
- Set up a robust cache policy for individual users

## Cleanups

### PM

1 Nephi 4:17-18 1 Nephi 5:8-9, 9-10 1 Nephi 5:22 end of chapter ! Nephi 7:8-9,
19-20

### Fix remaining markdown truncation cases in aligned data (9 cases)

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
