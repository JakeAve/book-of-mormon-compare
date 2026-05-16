import { getVersionDisplayName } from "../lib/data.ts";

interface Props {
  side: "v1" | "v2";
  current: string;
  versions: string[];
}

const SCROLL_KEY_PREFIX = "version-scroll:";

export default function VersionSelector({ side, current, versions }: Props) {
  // sessionStorage round-trip preserves exact scroll position.
  // Restore happens via an inline script in routes/_app.tsx so it runs
  // before first paint, avoiding the flash from a post-hydration effect.
  function onChange(e: Event) {
    const select = e.target as HTMLSelectElement;
    const key = SCROLL_KEY_PREFIX + globalThis.location.pathname;
    sessionStorage.setItem(key, String(globalThis.scrollY));
    const params = new URLSearchParams(globalThis.location.search);
    params.set(side, select.value);
    globalThis.location.search = params.toString();
  }

  return (
    <div style={{ width: "100%" }}>
      <select
        id={`version-${side}`}
        name={side}
        value={current}
        onChange={onChange}
        style={{
          appearance: "none",
          WebkitAppearance: "none",
          display: "block",
          width: "100%",
          maxWidth: "100%",
          overflow: "hidden",
          whiteSpace: "nowrap",
          textOverflow: "ellipsis",
          background: "var(--color-header-edition)",
          border: "none",
          color: "var(--color-header-muted)",
          fontSize: "0.625rem",
          fontWeight: "700",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          cursor: "pointer",
          outline: "none",
          padding: "1rem 1.5rem",
          margin: "0",
        }}
      >
        {versions.map((v) => (
          <option key={v} value={v} selected={v === current}>
            {getVersionDisplayName(v)}
          </option>
        ))}
      </select>
    </div>
  );
}
