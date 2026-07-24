import { useEffect, useRef } from "preact/hooks";
import { useSignal } from "@preact/signals";
import CloseIcon from "../components/CloseIcon.tsx";
import { reportRequest } from "./reportDialogSignal.ts";
import {
  ERROR_TYPE_LABELS,
  ERROR_TYPES,
  parseVersesInput,
} from "../lib/correctionReport.ts";
import { VERSION_SHORT_NAMES } from "../lib/data.ts";

interface Props {
  book: string;
  chapter: string;
  v1: string;
  v2: string;
}

type Status =
  | { state: "idle" }
  | { state: "submitting" }
  | { state: "success"; issueUrl?: string }
  | { state: "error"; message: string };

const inputStyle = {
  width: "100%",
  padding: "0.5rem",
  border: "1px solid var(--color-dialog-border)",
  borderRadius: "6px",
  background: "var(--color-bg)",
  color: "var(--color-text)",
  font: "inherit",
  fontSize: "0.875rem",
} as const;

const labelStyle = {
  display: "block",
  fontSize: "0.75rem",
  fontWeight: 600,
  marginBottom: "0.25rem",
  color: "var(--color-text)",
} as const;

export default function ReportDialog({ book, chapter, v1, v2 }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const version = useSignal<string>(v1);
  const errorType = useSignal<string>(ERROR_TYPES[0]);
  const versesInput = useSignal("");
  const selectedText = useSignal("");
  const expectedText = useSignal("");
  const description = useSignal("");
  const honeypot = useSignal("");
  const status = useSignal<Status>({ state: "idle" });

  useEffect(() => {
    const unsubscribe = reportRequest.subscribe((req) => {
      if (req === null) return;
      version.value = v1;
      errorType.value = ERROR_TYPES[0];
      expectedText.value = "";
      description.value = "";
      honeypot.value = "";
      if (req !== "manual") {
        versesInput.value = req.verses.length > 1
          ? `${req.verses[0]}-${req.verses[req.verses.length - 1]}`
          : String(req.verses[0] ?? "");
        selectedText.value = req.selectedText.slice(0, 500);
      } else {
        versesInput.value = "";
        selectedText.value = "";
      }
      status.value = { state: "idle" };
      dialogRef.current?.showModal();
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    function onClick(e: MouseEvent) {
      if (e.target === d) close();
    }
    function onClose() {
      reportRequest.value = null;
    }
    d.addEventListener("click", onClick);
    d.addEventListener("close", onClose);
    return () => {
      d.removeEventListener("click", onClick);
      d.removeEventListener("close", onClose);
    };
  }, []);

  function close() {
    dialogRef.current?.close();
  }

  async function submit(e: Event) {
    e.preventDefault();
    const verses = parseVersesInput(versesInput.value);
    if (!verses) {
      status.value = {
        state: "error",
        message: "Enter the verse number(s), e.g. 17 or 17-18.",
      };
      return;
    }
    status.value = { state: "submitting" };
    try {
      const res = await fetch("/report-correction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          version: version.value,
          comparedWith: version.value === v1 ? v2 : v1,
          book,
          chapter: parseInt(chapter, 10),
          verses,
          errorType: errorType.value,
          selectedText: selectedText.value,
          expectedText: expectedText.value,
          description: description.value,
          url: globalThis.location.href,
          website: honeypot.value,
        }),
      });
      const data = await res.json() as { ok: boolean; issueUrl?: string };
      if (!res.ok || !data.ok) {
        status.value = {
          state: "error",
          message: res.status === 429
            ? "Too many reports right now — please try again in a minute."
            : "Couldn't submit the report. Please try again later.",
        };
        return;
      }
      status.value = { state: "success", issueUrl: data.issueUrl };
      expectedText.value = "";
      description.value = "";
    } catch {
      status.value = {
        state: "error",
        message: "Couldn't submit the report. Please try again later.",
      };
    }
  }

  const st = status.value;

  return (
    <>
      <div style={{ textAlign: "center", padding: "1.5rem 0 0.5rem" }}>
        <button
          type="button"
          onClick={() => (reportRequest.value = "manual")}
          style={{
            background: "transparent",
            border: "none",
            cursor: "pointer",
            fontSize: "0.75rem",
            color: "var(--color-text)",
            opacity: 0.6,
            textDecoration: "underline",
          }}
        >
          Report an error on this page
        </button>
      </div>

      <dialog
        ref={dialogRef}
        style={{
          width: "clamp(280px, 92vw, 480px)",
          border: "1px solid var(--color-dialog-border)",
          borderRadius: "12px",
          background: "var(--color-dialog-bg)",
          color: "var(--color-text)",
          padding: 0,
        }}
      >
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0.75rem 1rem",
            borderBottom: "1px solid var(--color-dialog-border)",
          }}
        >
          <span
            style={{
              fontSize: "0.8125rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            Report an error
          </span>
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: "inherit",
              display: "inline-flex",
            }}
          >
            <CloseIcon size={16} />
          </button>
        </header>

        {st.state === "success"
          ? (
            <div style={{ padding: "1rem" }}>
              <p style={{ fontSize: "0.875rem", margin: "0 0 0.75rem" }}>
                Thank you — your report was submitted.
              </p>
              {st.issueUrl && (
                <p style={{ fontSize: "0.8125rem", margin: "0 0 0.75rem" }}>
                  You can follow it here:{" "}
                  <a href={st.issueUrl} target="_blank" rel="noopener">
                    {st.issueUrl}
                  </a>
                </p>
              )}
              <button type="button" onClick={close} style={inputStyle}>
                Close
              </button>
            </div>
          )
          : (
            <form
              onSubmit={submit}
              style={{
                padding: "1rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
              }}
            >
              <div>
                <label style={labelStyle} for="report-version">
                  Which version has the error?
                </label>
                <select
                  id="report-version"
                  style={inputStyle}
                  value={version.value}
                  onChange={(
                    e,
                  ) => (version.value = (e.target as HTMLSelectElement).value)}
                >
                  <option value={v1}>{VERSION_SHORT_NAMES[v1] ?? v1}</option>
                  <option value={v2}>{VERSION_SHORT_NAMES[v2] ?? v2}</option>
                  <option value="unsure">Not sure</option>
                </select>
              </div>

              <div>
                <label style={labelStyle} for="report-error-type">
                  What kind of error?
                </label>
                <select
                  id="report-error-type"
                  style={inputStyle}
                  value={errorType.value}
                  onChange={(
                    e,
                  ) => (errorType.value =
                    (e.target as HTMLSelectElement).value)}
                >
                  {ERROR_TYPES.map((t) => (
                    <option key={t} value={t}>{ERROR_TYPE_LABELS[t]}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={labelStyle} for="report-verses">
                  Verse(s)
                </label>
                <input
                  id="report-verses"
                  style={inputStyle}
                  placeholder="e.g. 17 or 17-18"
                  value={versesInput.value}
                  onInput={(
                    e,
                  ) => (versesInput.value =
                    (e.target as HTMLInputElement).value)}
                  required
                />
              </div>

              {selectedText.value && (
                <div>
                  <label style={labelStyle}>Reported text</label>
                  <blockquote
                    style={{
                      margin: 0,
                      padding: "0.5rem",
                      fontSize: "0.8125rem",
                      fontStyle: "italic",
                      borderLeft: "3px solid var(--color-dialog-border)",
                    }}
                  >
                    {selectedText.value}
                  </blockquote>
                </div>
              )}

              <div>
                <label style={labelStyle} for="report-expected">
                  What should it say? (optional)
                </label>
                <input
                  id="report-expected"
                  style={inputStyle}
                  maxlength={500}
                  value={expectedText.value}
                  onInput={(
                    e,
                  ) => (expectedText.value =
                    (e.target as HTMLInputElement).value)}
                />
              </div>

              <div>
                <label style={labelStyle} for="report-description">
                  Anything else? (optional)
                </label>
                <textarea
                  id="report-description"
                  style={{ ...inputStyle, minHeight: "4rem" }}
                  maxlength={2000}
                  value={description.value}
                  onInput={(
                    e,
                  ) => (description.value =
                    (e.target as HTMLTextAreaElement).value)}
                />
              </div>

              <input
                type="text"
                name="website"
                tabindex={-1}
                autocomplete="off"
                aria-hidden="true"
                style={{ position: "absolute", left: "-9999px" }}
                value={honeypot.value}
                onInput={(
                  e,
                ) => (honeypot.value = (e.target as HTMLInputElement).value)}
              />

              {st.state === "error" && (
                <p
                  role="alert"
                  style={{
                    margin: 0,
                    fontSize: "0.8125rem",
                    color: "var(--color-danger, #b91c1c)",
                  }}
                >
                  {st.message}
                </p>
              )}

              <button
                type="submit"
                disabled={st.state === "submitting"}
                style={{
                  ...inputStyle,
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                {st.state === "submitting" ? "Submitting…" : "Submit report"}
              </button>
            </form>
          )}
      </dialog>
    </>
  );
}
