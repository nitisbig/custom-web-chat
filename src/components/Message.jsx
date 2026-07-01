import { useMemo, useState } from "react";
import { useStore } from "../store.js";
import { renderMarkdown } from "../lib/markdown.js";
import { collectMessageActions } from "../plugins";
import { Icon } from "./Icons.jsx";
import clsx from "clsx";

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      className="flex items-center gap-1 rounded-md px-1.5 py-1 text-xs text-muted transition hover:bg-surface-2 hover:text-text"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1400);
        } catch {
          /* clipboard blocked */
        }
      }}
    >
      {copied ? (
        <Icon.Check width={13} height={13} />
      ) : (
        <Icon.Copy width={13} height={13} />
      )}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

export default function Message({ message }) {
  const enabledPlugins = useStore((s) => s.enabledPlugins);
  const retryLast = useStore((s) => s.retryLast);
  const ctx = useStore((s) => s._pluginCtx);

  const isUser = message.role === "user";
  const isNote = message.role === "note";

  const html = useMemo(
    () => (isNote ? null : renderMarkdown(message.content)),
    [message.content, isNote]
  );

  // Delegated handler for the per-code-block copy buttons injected by markdown.js.
  const onBodyClick = async (e) => {
    const btn = e.target.closest(".code-copy");
    if (!btn) return;
    const code = btn.closest(".code-block")?.querySelector("pre code");
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code.innerText);
      const label = btn.querySelector("span");
      if (label && !btn.dataset.copied) {
        btn.dataset.copied = "1";
        const prev = label.textContent;
        label.textContent = "Copied";
        btn.classList.add("is-copied");
        setTimeout(() => {
          label.textContent = prev;
          btn.classList.remove("is-copied");
          delete btn.dataset.copied;
        }, 1400);
      }
    } catch {
      /* clipboard blocked */
    }
  };

  // System notes render as a slim centered pill.
  if (isNote) {
    return (
      <div className="flex justify-center animate-fade-in">
        <div className="rounded-full border border-border bg-surface-2/60 px-3 py-1 text-xs text-muted">
          {message.content}
        </div>
      </div>
    );
  }

  const actions = isUser ? [] : collectMessageActions(enabledPlugins);

  return (
    <div className="group animate-fade-up">
      <div className="flex gap-3.5">
        {/* Avatar */}
        <div
          className={clsx(
            "grid h-8 w-8 shrink-0 place-items-center rounded-lg text-xs font-semibold",
            isUser
              ? "bg-accent-soft/15 text-accent"
              : "bg-surface-2 text-text border border-border"
          )}
        >
          {isUser ? "You" : "AI"}
        </div>

        {/* Body */}
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2 text-xs text-muted">
            {isUser ? "You" : "Assistant"}
          </div>

          <div
            className={clsx(
              "rounded-xl border px-4 py-3 text-[15px]",
              isUser
                ? "border-accent/20 bg-accent-soft/[0.07]"
                : "border-border bg-surface"
            )}
          >
            {message.content || message.streaming ? (
              <div
                className={clsx(
                  "prose-chat",
                  message.streaming && "stream-cursor"
                )}
                onClick={onBodyClick}
                dangerouslySetInnerHTML={{ __html: html }}
              />
            ) : null}

            {message.error && (
              <div className="mt-1 whitespace-pre-wrap rounded-lg border border-danger/30 bg-danger/[0.06] px-3 py-2 text-sm text-danger">
                {message.error}
              </div>
            )}
          </div>

          {/* Action bar */}
          {!message.streaming && (
            <div className="mt-1.5 flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
              {message.content && <CopyButton text={message.content} />}

              {message.error && (
                <button
                  className="flex items-center gap-1 rounded-md px-1.5 py-1 text-xs text-muted transition hover:bg-surface-2 hover:text-text"
                  onClick={retryLast}
                >
                  <Icon.Refresh width={13} height={13} />
                  Retry
                </button>
              )}

              {actions.map((a, i) => (
                <button
                  key={i}
                  className="flex items-center gap-1 rounded-md px-1.5 py-1 text-xs text-muted transition hover:bg-surface-2 hover:text-text"
                  onClick={() => a.run(message, ctx())}
                >
                  {a.icon && <span className="font-mono">{a.icon}</span>}
                  {a.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
