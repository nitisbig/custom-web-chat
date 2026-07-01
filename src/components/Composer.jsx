import { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "../store.js";
import { collectCommands } from "../plugins";
import { Icon } from "./Icons.jsx";
import clsx from "clsx";

export default function Composer() {
  const composer = useStore((s) => s.composer);
  const setComposer = useStore((s) => s.setComposer);
  const send = useStore((s) => s.send);
  const stop = useStore((s) => s.stop);
  const streaming = useStore((s) => s.streaming);
  const enabledPlugins = useStore((s) => s.enabledPlugins);

  const taRef = useRef(null);
  const [hi, setHi] = useState(0); // highlighted suggestion index

  // Auto-grow textarea.
  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 220) + "px";
  }, [composer]);

  // Slash-command suggestions when the composer starts with "/word".
  const suggestions = useMemo(() => {
    const m = composer.match(/^\/(\w*)$/);
    if (!m) return [];
    const q = m[1].toLowerCase();
    const all = collectCommands(enabledPlugins);
    return Array.from(all.values())
      .filter(({ command }) => command.name.toLowerCase().startsWith(q))
      .slice(0, 6);
  }, [composer, enabledPlugins]);

  useEffect(() => setHi(0), [suggestions.length]);

  const applySuggestion = (s) => {
    setComposer("/" + s.command.name + " ");
    taRef.current?.focus();
  };

  const onKeyDown = (e) => {
    if (suggestions.length) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHi((h) => (h + 1) % suggestions.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setHi((h) => (h - 1 + suggestions.length) % suggestions.length);
        return;
      }
      if (e.key === "Tab") {
        e.preventDefault();
        applySuggestion(suggestions[hi]);
        return;
      }
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="relative px-4 pb-5 pt-2 md:px-8">
      <div className="mx-auto w-full max-w-3xl">
        {/* Slash-command popover */}
        {suggestions.length > 0 && (
          <div className="mb-2 overflow-hidden rounded-xl border border-border bg-surface shadow-pop animate-scale-in">
            {suggestions.map((s, i) => (
              <button
                key={s.command.name}
                onMouseEnter={() => setHi(i)}
                onClick={() => applySuggestion(s)}
                className={clsx(
                  "flex w-full items-center gap-3 px-3.5 py-2.5 text-left text-sm transition",
                  i === hi ? "bg-surface-2" : "hover:bg-surface-2/60"
                )}
              >
                <span className="font-mono text-accent">/{s.command.name}</span>
                <span className="truncate text-muted">
                  {s.command.description}
                </span>
                <span className="ml-auto text-[10px] uppercase tracking-wide text-muted">
                  {s.plugin.name}
                </span>
              </button>
            ))}
          </div>
        )}

        <div className="flex items-end gap-2 rounded-2xl border border-border bg-surface p-2 pl-4 shadow-soft transition focus-within:border-accent">
          <textarea
            ref={taRef}
            rows={1}
            value={composer}
            onChange={(e) => setComposer(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Message Nexus…   (Enter to send · Shift+Enter for newline · / for commands)"
            className="max-h-[220px] flex-1 resize-none bg-transparent py-2 text-[15px] leading-relaxed text-text outline-none placeholder:text-muted"
          />
          <button
            onClick={() => (streaming ? stop() : send())}
            disabled={!streaming && !composer.trim()}
            className={clsx(
              "grid h-10 w-10 shrink-0 place-items-center rounded-xl transition",
              streaming
                ? "bg-surface-2 text-text hover:bg-surface-2/70"
                : "bg-accent text-accent-fg hover:opacity-90 disabled:opacity-40 disabled:hover:opacity-40"
            )}
            title={streaming ? "Stop" : "Send"}
          >
            {streaming ? (
              <Icon.Stop width={16} height={16} />
            ) : (
              <Icon.Send width={18} height={18} />
            )}
          </button>
        </div>

        <p className="mt-2 text-center text-[11px] text-muted">
          Your keys and chats stay in your browser. Requests go only to the
          endpoint you configure.
        </p>
      </div>
    </div>
  );
}
