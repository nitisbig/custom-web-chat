import { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "../store.js";
import { Icon } from "./Icons.jsx";
import * as vault from "../lib/vault.js";
import clsx from "clsx";

// Quick provider + model switcher for the active conversation. Selecting a
// model updates the current chat (and becomes the default for new chats).
export default function ModelPicker() {
  const providers = useStore((s) => s.providers);
  const convo = useStore((s) => s.activeConversation());
  const setConversationModel = useStore((s) => s.setConversationModel);
  const openSettings = useStore((s) => s.openSettings);
  const vaultLocked = useStore((s) => s.vaultLocked);
  // eslint-disable-next-line no-unused-vars
  const vaultTick = useStore((s) => s.vaultTick); // re-render when keys change

  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  useEffect(() => {
    if (!open) setQ("");
  }, [open]);

  const activeProvider = providers.find((p) => p.id === convo?.providerId);
  const label = convo?.model
    ? convo.model
    : "no model";

  const groups = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return providers
      .map((p) => ({
        provider: p,
        models: (p.models || []).filter(
          (m) =>
            !needle ||
            m.toLowerCase().includes(needle) ||
            p.label.toLowerCase().includes(needle)
        ),
      }))
      .filter((g) => g.models.length > 0);
  }, [providers, q]);

  const pick = (providerId, model) => {
    setConversationModel(convo.id, providerId, model);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-lg border border-border bg-surface-2/50 px-2.5 py-1.5 text-xs text-muted transition hover:border-accent hover:text-text"
        title="Choose model"
      >
        <span
          className={clsx(
            "h-1.5 w-1.5 rounded-full",
            convo?.model ? "bg-success" : "bg-muted"
          )}
        />
        <span className="max-w-[160px] truncate sm:max-w-[220px]">{label}</span>
        {activeProvider && (
          <span className="hidden text-[10px] uppercase tracking-wide text-muted/70 sm:inline">
            {activeProvider.label}
          </span>
        )}
        <Icon.Chevron width={13} height={13} />
      </button>

      {open && (
        <div className="absolute right-0 z-40 mt-2 w-72 overflow-hidden rounded-xl border border-border bg-surface shadow-pop animate-scale-in">
          <div className="border-b border-border p-2">
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search models…"
              className="w-full rounded-lg bg-bg px-2.5 py-1.5 text-xs text-text outline-none placeholder:text-muted"
            />
          </div>

          <div className="max-h-72 overflow-y-auto py-1">
            {groups.length === 0 && (
              <div className="px-3 py-4 text-center text-xs text-muted">
                No models. Add one in settings.
              </div>
            )}
            {groups.map(({ provider, models }) => (
              <div key={provider.id} className="mb-1">
                <div className="flex items-center gap-1.5 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted">
                  {provider.label}
                  {provider.needsKey &&
                    !vaultLocked &&
                    !vault.hasSecret(provider.id) && (
                      <span className="text-danger/80" title="No API key set">
                        · no key
                      </span>
                    )}
                  {provider.needsKey && vaultLocked && (
                    <Icon.Lock width={10} height={10} />
                  )}
                </div>
                {models.map((m) => {
                  const active =
                    provider.id === convo?.providerId && m === convo?.model;
                  return (
                    <button
                      key={provider.id + "/" + m}
                      onClick={() => pick(provider.id, m)}
                      className={clsx(
                        "flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition",
                        active ? "bg-surface-2 text-text" : "text-muted hover:bg-surface-2/60 hover:text-text"
                      )}
                    >
                      <span className="truncate font-mono text-[12px]">{m}</span>
                      {active && (
                        <Icon.Check width={13} height={13} className="ml-auto text-accent" />
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          <button
            onClick={() => {
              setOpen(false);
              openSettings();
            }}
            className="flex w-full items-center gap-2 border-t border-border px-3 py-2.5 text-xs text-muted transition hover:bg-surface-2 hover:text-text"
          >
            <Icon.Settings width={14} height={14} />
            Manage providers & keys
          </button>
        </div>
      )}
    </div>
  );
}
