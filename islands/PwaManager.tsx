import { useEffect, useState } from "preact/hooks";
import CloseIcon from "../components/CloseIcon.tsx";

type Banner = {
  message: string;
  action?: { label: string; onClick: () => void };
  onDismiss?: () => void;
};

const VISIT_KEY = "pwa_chapter_visits";
const VISIT_THRESHOLD = 2;
const INSTALL_DONE_KEY = "pwa_install_done";

function lsSet(key: string, value = "1") {
  try {
    localStorage.setItem(key, value);
  } catch { /* storage blocked (e.g. Safari private mode) */ }
}

function lsGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export default function PwaManager() {
  const [note, setNote] = useState<Banner | null>(null);

  useEffect(() => {
    // In dev, unregister any leftover SW from a previous `preview` run and
    // clear its caches so dev never serves stale content. unregister() releases
    // control on the *next* navigation, so reload once if a controller is
    // currently serving this page.
    if (import.meta.env.DEV) {
      const hadController = "serviceWorker" in navigator &&
        navigator.serviceWorker.controller !== null;
      const tasks: Promise<unknown>[] = [];
      if ("serviceWorker" in navigator) {
        tasks.push(
          navigator.serviceWorker.getRegistrations().then((regs) =>
            Promise.all(regs.map((reg) => reg.unregister()))
          ),
        );
      }
      if ("caches" in globalThis) {
        tasks.push(
          caches.keys().then((keys) =>
            Promise.all(keys.map((key) => caches.delete(key)))
          ),
        );
      }
      if (hadController) {
        Promise.all(tasks).then(() => globalThis.location.reload());
      }
      return;
    }

    // Increment first so that when onInstallPrompt fires (or already fired and
    // we read deferredPrompt below), the count reflects the current visit.
    const isChapter = /^\/[^/]+\/\d+/.test(globalThis.location.pathname);
    if (isChapter) {
      const raw = parseInt(lsGet(VISIT_KEY) ?? "0", 10);
      const count = Number.isFinite(raw) ? raw : 0;
      lsSet(VISIT_KEY, String(count + 1));
    }

    if (!("serviceWorker" in navigator)) return;

    let deferredPrompt: (Event & { prompt(): void }) | null = null;

    function showInstallNote() {
      if (!deferredPrompt) return;
      if (lsGet(INSTALL_DONE_KEY)) return;
      setNote({
        message: "Add to home screen for offline access.",
        action: {
          label: "Install",
          onClick: () => {
            deferredPrompt?.prompt();
            deferredPrompt = null;
            setNote(null);
          },
        },
        onDismiss: () => lsSet(INSTALL_DONE_KEY),
      });
    }

    const onInstallPrompt = (e: Event) => {
      e.preventDefault();
      deferredPrompt = e as typeof deferredPrompt;
      const count = parseInt(lsGet(VISIT_KEY) ?? "0", 10);
      if (count >= VISIT_THRESHOLD) showInstallNote();
    };
    globalThis.addEventListener("beforeinstallprompt", onInstallPrompt);

    const onAppInstalled = () => {
      lsSet(INSTALL_DONE_KEY);
      deferredPrompt = null;
      setNote(null);
    };
    globalThis.addEventListener("appinstalled", onAppInstalled);

    function showSwUpdateNote(worker: ServiceWorker) {
      setNote({
        message: "App updated — tap to apply.",
        action: {
          label: "Apply",
          onClick: () => {
            // Wait for the new SW to take control before reloading so the
            // page is served by the updated worker, not the old one.
            navigator.serviceWorker.addEventListener(
              "controllerchange",
              () => globalThis.location.reload(),
              { once: true },
            );
            worker.postMessage({ type: "SKIP_WAITING" });
          },
        },
      });
    }

    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((reg) => {
        if (reg.waiting) {
          showSwUpdateNote(reg.waiting);
        }
        reg.addEventListener("updatefound", () => {
          const incoming = reg.installing;
          if (!incoming) return;
          incoming.addEventListener("statechange", () => {
            if (
              incoming.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              showSwUpdateNote(incoming);
            }
          });
        });
      })
      .catch(() => {
        // sw.js is only available in the production build — silent in dev
      });

    if (document.querySelector("[data-offline-fallback]")) {
      setNote({
        message: "You're offline — try reloading the page you wanted.",
        action: {
          label: "Retry",
          onClick: () => globalThis.location.reload(),
        },
      });
    }

    return () => {
      globalThis.removeEventListener("beforeinstallprompt", onInstallPrompt);
      globalThis.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  if (!note) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        bottom: "1rem",
        left: "50%",
        transform: "translateX(-50%)",
        display: "flex",
        flexDirection: "column",
        gap: "0.5rem",
        padding: "0.625rem 1rem",
        background: "var(--color-dialog-bg)",
        border: "1px solid var(--color-dialog-border)",
        borderRadius: "8px",
        boxShadow: "0 4px 24px rgba(0,0,0,0.18)",
        zIndex: 300,
        fontFamily: "system-ui, -apple-system, sans-serif",
        fontSize: "0.875rem",
        color: "var(--color-text)",
        maxWidth: "calc(100vw - 2rem)",
        width: "max-content",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem" }}>
        <span style={{ flex: 1 }}>{note.message}</span>
        <button
          type="button"
          aria-label="Dismiss"
          onClick={() => {
            note.onDismiss?.();
            setNote(null);
          }}
          style={{
            display: "flex",
            alignItems: "center",
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--color-text)",
            padding: "0 0.25rem",
            opacity: 0.6,
            flexShrink: 0,
          }}
        >
          <CloseIcon />
        </button>
      </div>
      {note.action && (
        <button
          type="button"
          onClick={note.action.onClick}
          style={{
            padding: "0.375rem 0.75rem",
            background: "var(--color-text)",
            color: "var(--color-bg)",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "0.8125rem",
            fontWeight: 600,
            width: "100%",
          }}
        >
          {note.action.label}
        </button>
      )}
    </div>
  );
}
