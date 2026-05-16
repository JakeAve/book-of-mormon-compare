import { useEffect } from "preact/hooks";

export default function ScrollRestorer() {
  useEffect(() => {
    try {
      const key = "version-scroll:" + globalThis.location.pathname;
      const saved = sessionStorage.getItem(key);
      if (saved !== null) {
        sessionStorage.removeItem(key);
        globalThis.scrollTo(0, Number(saved));
      }
    } catch {
      // sessionStorage unavailable; ignore.
    }
  }, []);

  return null;
}
