import { useEffect, useState } from "preact/hooks";

type Notification = {
  message: string;
  action?: { label: string; onClick: () => void };
};

const VISIT_KEY = "pwa_chapter_visits";
const VISIT_THRESHOLD = 2;

export default function PwaManager() {
  const [note, setNote] = useState<Notification | null>(null);

  // Count chapter page visits for install prompt gating
  useEffect(() => {
    const isChapter = /^\/[^/]+\/\d+/.test(globalThis.location?.pathname ?? "");
    if (!isChapter) return;
    const count = parseInt(localStorage.getItem(VISIT_KEY) ?? "0", 10);
    localStorage.setItem(VISIT_KEY, String(count + 1));
  }, []);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    // Capture beforeinstallprompt; surface after visit threshold
    let deferredPrompt: (Event & { prompt(): void }) | null = null;
    const onInstallPrompt = (e: Event) => {
      e.preventDefault();
      deferredPrompt = e as typeof deferredPrompt;
      const count = parseInt(localStorage.getItem(VISIT_KEY) ?? "0", 10);
      if (count >= VISIT_THRESHOLD) {
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
        });
      }
    };
    globalThis.addEventListener("beforeinstallprompt", onInstallPrompt);

    function showSwUpdateNote(worker: ServiceWorker) {
      setNote({
        message: "App updated — tap to apply.",
        action: {
          label: "Apply",
          onClick: () => {
            worker.postMessage({ type: "SKIP_WAITING" });
            location.reload();
          },
        },
      });
    }

    navigator.serviceWorker.register("/sw.js", { scope: "/" }).then((reg) => {
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
    });

    // Content-change messages from BroadcastUpdatePlugin (v7 uses postMessage, not BroadcastChannel)
    const onSwMessage = (event: MessageEvent) => {
      if (event.data?.type === "CACHE_UPDATED") {
        setNote({
          message: "This page has been updated — tap to reload.",
          action: { label: "Reload", onClick: () => location.reload() },
        });
      }
    };
    navigator.serviceWorker.addEventListener("message", onSwMessage);

    return () => {
      navigator.serviceWorker.removeEventListener("message", onSwMessage);
      globalThis.removeEventListener("beforeinstallprompt", onInstallPrompt);
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
        alignItems: "center",
        gap: "0.75rem",
        padding: "0.625rem 1rem",
        background: "var(--color-dialog-bg)",
        border: "1px solid var(--color-dialog-border)",
        borderRadius: "8px",
        boxShadow: "0 4px 24px rgba(0,0,0,0.18)",
        zIndex: 300,
        fontFamily: "system-ui, -apple-system, sans-serif",
        fontSize: "0.875rem",
        color: "var(--color-text)",
        whiteSpace: "nowrap",
      }}
    >
      <span>{note.message}</span>
      {note.action && (
        <button
          type="button"
          onClick={note.action.onClick}
          style={{
            padding: "0.25rem 0.75rem",
            background: "var(--color-text)",
            color: "var(--color-bg)",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "0.8125rem",
            fontWeight: 600,
          }}
        >
          {note.action.label}
        </button>
      )}
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => setNote(null)}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "var(--color-text)",
          fontSize: "1rem",
          lineHeight: 1,
          padding: "0 0.25rem",
          opacity: 0.6,
        }}
      >
        ×
      </button>
    </div>
  );
}
