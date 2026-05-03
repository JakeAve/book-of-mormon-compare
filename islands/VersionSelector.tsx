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
    <select value={current} onChange={onChange}>
      {versions.map((v) => (
        <option key={v} value={v} selected={v === current}>
          {v}
        </option>
      ))}
    </select>
  );
}
