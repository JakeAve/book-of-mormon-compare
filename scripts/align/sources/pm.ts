import { DEFAULT_CURSOR_CONFIG, type SourceAdapter } from "./types.ts";

// Printer's Manuscript (PM): scribal transcription of the dictation,
// generally MORE verbose than the canonical 2013 text. Default cursor
// settings are tuned for PM.
const pm: SourceAdapter = {
  slug: "pm",
  label: "Printer's Manuscript",
  raw: "data/raw/pm",
  out: "data/bom/pm",
  cursor: DEFAULT_CURSOR_CONFIG,
};

export default pm;
