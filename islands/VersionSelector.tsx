import { getVersionDisplayName } from "../lib/data.ts";

interface Props {
  side: "v1" | "v2";
  current: string;
  versions: string[];
}

export default function VersionSelector({ side, current, versions }: Props) {
  function onChange(e: Event) {
    const select = e.target as HTMLSelectElement;
    const params = new URLSearchParams(globalThis.location.search);
    params.set(side, select.value);
    globalThis.location.search = params.toString();
  }

  return (
    <select
      value={current}
      onChange={onChange}
      data-tutorial="version-selector"
      style={{
        appearance: "none",
        WebkitAppearance: "none",
        display: "block",
        width: "100%",
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
  );
}
