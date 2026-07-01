import { useEffect, useState } from "react";
import { useStore } from "../store.js";
import { Icon } from "./Icons.jsx";

// Full-screen preview for browser-runnable code (opened from a code block's
// Preview button). The code renders inside a sandboxed iframe: omitting
// `allow-same-origin` gives it an opaque origin, so generated scripts can run
// but cannot touch the parent page, cookies, or localStorage.
export default function PreviewModal() {
  const code = useStore((s) => s.preview);
  const close = useStore((s) => s.closePreview);
  const [copied, setCopied] = useState(false);

  const open = code != null;

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && close();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, close]);

  if (!open) return null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      /* clipboard blocked */
    }
  };

  const openTab = () => {
    const url = URL.createObjectURL(new Blob([code], { type: "text/html" }));
    window.open(url, "_blank", "noopener");
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fade-in"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="flex h-[85vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-pop animate-scale-in">
        <div className="flex items-center justify-between gap-4 border-b border-border px-4 py-3">
          <h2 className="font-display text-base font-semibold text-text">
            Preview
          </h2>
          <div className="flex items-center gap-1">
            <button
              onClick={openTab}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-muted transition hover:bg-surface-2 hover:text-text"
            >
              <Icon.ExternalLink width={15} height={15} />
              Open in new tab
            </button>
            <button
              onClick={copy}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-muted transition hover:bg-surface-2 hover:text-text"
            >
              {copied ? (
                <Icon.Check width={15} height={15} />
              ) : (
                <Icon.Copy width={15} height={15} />
              )}
              {copied ? "Copied" : "Copy"}
            </button>
            <button
              onClick={close}
              className="rounded-lg p-1.5 text-muted transition hover:bg-surface-2 hover:text-text"
              aria-label="Close"
            >
              <Icon.Close />
            </button>
          </div>
        </div>
        <iframe
          title="preview"
          srcDoc={code}
          className="h-full w-full flex-1 bg-white"
          sandbox="allow-scripts allow-forms allow-modals allow-popups"
        />
      </div>
    </div>
  );
}
