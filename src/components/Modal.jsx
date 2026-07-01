import { useEffect } from "react";
import { Icon } from "./Icons.jsx";

export default function Modal({ open, onClose, title, subtitle, children, footer }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg rounded-2xl border border-border bg-surface shadow-pop animate-scale-in max-h-[90vh] flex flex-col">
        <div className="flex items-start justify-between gap-4 p-6 pb-4">
          <div>
            <h2 className="font-display text-xl font-semibold text-text">
              {title}
            </h2>
            {subtitle && (
              <p className="mt-1 text-sm text-muted">{subtitle}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted transition hover:bg-surface-2 hover:text-text"
            aria-label="Close"
          >
            <Icon.Close />
          </button>
        </div>
        <div className="overflow-y-auto px-6 py-2">{children}</div>
        {footer && (
          <div className="flex justify-end gap-3 p-6 pt-4">{footer}</div>
        )}
      </div>
    </div>
  );
}
