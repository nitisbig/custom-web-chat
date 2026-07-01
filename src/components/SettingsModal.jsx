import { useEffect, useState } from "react";
import { useStore } from "../store.js";
import Modal from "./Modal.jsx";
import { PROVIDER_PRESETS, THEMES, ACCENTS } from "../lib/presets.js";
import clsx from "clsx";

function Field({ label, desc, children }) {
  return (
    <div className="mb-4">
      <label className="mb-1.5 block text-sm font-medium text-text">
        {label}
      </label>
      {children}
      {desc && <p className="mt-1 text-xs text-muted">{desc}</p>}
    </div>
  );
}

const inputCls =
  "w-full rounded-lg border border-border bg-bg px-3 py-2.5 text-sm text-text outline-none transition focus:border-accent placeholder:text-muted";

export default function SettingsModal() {
  const open = useStore((s) => s.settingsOpen);
  const close = useStore((s) => s.closeSettings);
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);
  const theme = useStore((s) => s.theme);
  const setTheme = useStore((s) => s.setTheme);
  const accent = useStore((s) => s.accent);
  const setAccent = useStore((s) => s.setAccent);

  const [form, setForm] = useState(settings);
  const [err, setErr] = useState("");

  // Sync local form when the modal opens.
  useEffect(() => {
    if (open) {
      setForm(settings);
      setErr("");
    }
  }, [open, settings]);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const applyPreset = (p) => {
    set({ baseUrl: p.baseUrl, model: p.model });
  };

  const save = () => {
    if (!form.baseUrl.trim() || !form.model.trim()) {
      setErr("Base URL and model are required.");
      return;
    }
    updateSettings({
      baseUrl: form.baseUrl.trim(),
      apiKey: form.apiKey.trim(),
      model: form.model.trim(),
      systemPrompt: form.systemPrompt,
      temperature: clampNum(form.temperature, 0, 2, 0.7),
      maxTokens: Math.max(0, parseInt(form.maxTokens) || 0),
    });
    close();
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="Settings"
      subtitle="Connect any OpenAI-compatible endpoint. Everything is stored locally."
      footer={
        <>
          <button
            onClick={close}
            className="rounded-lg px-4 py-2 text-sm text-muted transition hover:text-text"
          >
            Cancel
          </button>
          <button
            onClick={save}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-fg transition hover:opacity-90"
          >
            Save
          </button>
        </>
      }
    >
      {/* Provider presets */}
      <Field label="Provider">
        <div className="flex flex-wrap gap-2">
          {PROVIDER_PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => applyPreset(p)}
              className={clsx(
                "rounded-lg border px-3 py-1.5 text-xs transition",
                form.baseUrl === p.baseUrl
                  ? "border-accent bg-accent-soft/10 text-text"
                  : "border-border text-muted hover:border-accent hover:text-text"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </Field>

      <Field
        label="Base URL"
        desc="The API root. Requests POST to /chat/completions under this URL."
      >
        <input
          className={inputCls}
          value={form.baseUrl}
          spellCheck={false}
          onChange={(e) => set({ baseUrl: e.target.value })}
          placeholder="https://api.openai.com/v1"
        />
      </Field>

      <Field
        label="API Key"
        desc="Sent as Authorization: Bearer …. Leave blank for local servers."
      >
        <input
          className={inputCls}
          type="password"
          autoComplete="off"
          spellCheck={false}
          value={form.apiKey}
          onChange={(e) => set({ apiKey: e.target.value })}
          placeholder="sk-…"
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Model">
          <input
            className={inputCls}
            value={form.model}
            spellCheck={false}
            onChange={(e) => set({ model: e.target.value })}
            placeholder="gpt-4o-mini"
          />
        </Field>
        <Field label="Temperature" desc="0 = precise, 2 = creative">
          <input
            className={inputCls}
            type="number"
            min="0"
            max="2"
            step="0.1"
            value={form.temperature}
            onChange={(e) => set({ temperature: e.target.value })}
          />
        </Field>
      </div>

      <Field
        label="Max tokens"
        desc="Cap on response length. 0 uses the provider default."
      >
        <input
          className={inputCls}
          type="number"
          min="0"
          step="64"
          value={form.maxTokens}
          onChange={(e) => set({ maxTokens: e.target.value })}
          placeholder="0"
        />
      </Field>

      <Field
        label="System prompt"
        desc="Optional persistent instruction sent at the start of every request."
      >
        <textarea
          className={clsx(inputCls, "min-h-[72px] resize-y")}
          value={form.systemPrompt}
          onChange={(e) => set({ systemPrompt: e.target.value })}
          placeholder="You are a helpful assistant."
        />
      </Field>

      {/* Appearance */}
      <div className="mt-2 border-t border-border pt-4">
        <Field label="Theme">
          <div className="flex flex-wrap gap-2">
            {THEMES.map((t) => (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                className={clsx(
                  "rounded-lg border px-3 py-1.5 text-xs transition",
                  theme === t.id
                    ? "border-accent bg-accent-soft/10 text-text"
                    : "border-border text-muted hover:border-accent hover:text-text"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Accent">
          <div className="flex flex-wrap gap-2.5">
            {ACCENTS.map((a) => (
              <button
                key={a.id}
                onClick={() => setAccent(a.id)}
                title={a.label}
                className={clsx(
                  "h-8 w-8 rounded-full border-2 transition",
                  accent === a.id
                    ? "border-text scale-110"
                    : "border-transparent hover:scale-105"
                )}
                style={{ backgroundColor: a.swatch }}
              />
            ))}
          </div>
        </Field>
      </div>

      {err && (
        <div className="mt-1 rounded-lg border border-danger/30 bg-danger/[0.06] px-3 py-2 text-sm text-danger">
          {err}
        </div>
      )}
    </Modal>
  );
}

function clampNum(v, min, max, fallback) {
  const n = parseFloat(v);
  if (Number.isNaN(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}
