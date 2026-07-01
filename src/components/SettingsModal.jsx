import { useEffect, useRef, useState } from "react";
import { useStore } from "../store.js";
import Modal from "./Modal.jsx";
import {
  PROVIDER_PRESETS,
  presetToProvider,
  THEMES,
  ACCENTS,
} from "../lib/presets.js";
import * as vault from "../lib/vault.js";
import { Icon } from "./Icons.jsx";
import clsx from "clsx";

const inputCls =
  "w-full rounded-lg border border-border bg-bg px-3 py-2.5 text-sm text-text outline-none transition focus:border-accent placeholder:text-muted";

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

function Section({ title, children, action }) {
  return (
    <div className="mt-5 border-t border-border pt-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">
          {title}
        </h3>
        {action}
      </div>
      {children}
    </div>
  );
}

function ProviderCard({ provider, vaultLocked }) {
  const updateProvider = useStore((s) => s.updateProvider);
  const removeProvider = useStore((s) => s.removeProvider);
  const setProviderKey = useStore((s) => s.setProviderKey);
  const fetchProviderModels = useStore((s) => s.fetchProviderModels);

  const [label, setLabel] = useState(provider.label);
  const [baseUrl, setBaseUrl] = useState(provider.baseUrl);
  const [keyInput, setKeyInput] = useState("");
  const [newModel, setNewModel] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setLabel(provider.label);
    setBaseUrl(provider.baseUrl);
  }, [provider.id]); // reset when a different provider is rendered here

  const keySet = !vaultLocked && vault.hasSecret(provider.id);

  const addModel = () => {
    const m = newModel.trim();
    if (!m) return;
    const models = Array.from(new Set([...(provider.models || []), m]));
    updateProvider(provider.id, { models });
    setNewModel("");
  };

  const removeModel = (m) => {
    updateProvider(provider.id, {
      models: (provider.models || []).filter((x) => x !== m),
    });
  };

  const saveKey = async () => {
    await setProviderKey(provider.id, keyInput.trim());
    setKeyInput("");
    setMsg("Key saved.");
    setTimeout(() => setMsg(""), 1500);
  };

  const doFetch = async () => {
    setBusy(true);
    setMsg("");
    try {
      const models = await fetchProviderModels(provider.id);
      setMsg(`Fetched ${models.length} model${models.length === 1 ? "" : "s"}.`);
    } catch (e) {
      setMsg(e.message || "Fetch failed.");
    } finally {
      setBusy(false);
      setTimeout(() => setMsg(""), 3000);
    }
  };

  return (
    <div className="mb-3 rounded-xl border border-border bg-surface-2/30 p-3">
      <div className="mb-2 flex items-center gap-2">
        <input
          className="flex-1 rounded-md bg-transparent px-1 py-0.5 text-sm font-medium text-text outline-none focus:bg-bg"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onBlur={() => updateProvider(provider.id, { label: label.trim() || provider.id })}
        />
        <label className="flex items-center gap-1 text-[11px] text-muted">
          <input
            type="checkbox"
            checked={provider.needsKey}
            onChange={(e) =>
              updateProvider(provider.id, { needsKey: e.target.checked })
            }
          />
          needs key
        </label>
        <button
          onClick={() => removeProvider(provider.id)}
          className="rounded p-1 text-muted transition hover:text-danger"
          title="Remove provider"
        >
          <Icon.Trash width={15} height={15} />
        </button>
      </div>

      <input
        className={clsx(inputCls, "mb-2")}
        value={baseUrl}
        spellCheck={false}
        placeholder="https://api.example.com/v1"
        onChange={(e) => setBaseUrl(e.target.value)}
        onBlur={() => updateProvider(provider.id, { baseUrl: baseUrl.trim() })}
      />

      {provider.needsKey && (
        <div className="mb-2 flex gap-2">
          <input
            className={inputCls}
            type="password"
            autoComplete="off"
            spellCheck={false}
            placeholder={keySet ? "•••••••• (saved)" : vaultLocked ? "locked — unlock first" : "sk-…"}
            value={keyInput}
            disabled={vaultLocked}
            onChange={(e) => setKeyInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && keyInput.trim() && saveKey()}
          />
          <button
            onClick={saveKey}
            disabled={vaultLocked || !keyInput.trim()}
            className="shrink-0 rounded-lg border border-border px-3 text-xs text-muted transition hover:border-accent hover:text-text disabled:opacity-40"
          >
            {keySet ? "Update" : "Save"}
          </button>
        </div>
      )}

      {/* Models */}
      <div className="mb-2 flex flex-wrap gap-1.5">
        {(provider.models || []).map((m) => (
          <span
            key={m}
            className="inline-flex items-center gap-1 rounded-md border border-border bg-bg px-2 py-1 font-mono text-[11px] text-text"
          >
            {m}
            <button
              onClick={() => removeModel(m)}
              className="text-muted transition hover:text-danger"
              title="Remove model"
            >
              <Icon.Close width={11} height={11} />
            </button>
          </span>
        ))}
        {(provider.models || []).length === 0 && (
          <span className="text-[11px] text-muted">No models yet.</span>
        )}
      </div>

      <div className="flex gap-2">
        <input
          className={clsx(inputCls, "py-1.5 text-xs")}
          value={newModel}
          spellCheck={false}
          placeholder="Add model id…"
          onChange={(e) => setNewModel(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addModel()}
        />
        <button
          onClick={addModel}
          className="shrink-0 rounded-lg border border-border px-2.5 text-xs text-muted transition hover:border-accent hover:text-text"
        >
          Add
        </button>
        <button
          onClick={doFetch}
          disabled={busy}
          className="flex shrink-0 items-center gap-1 rounded-lg border border-border px-2.5 text-xs text-muted transition hover:border-accent hover:text-text disabled:opacity-40"
          title="Fetch models from the provider"
        >
          <Icon.Refresh width={13} height={13} />
          {busy ? "…" : "Fetch"}
        </button>
      </div>

      {msg && <p className="mt-2 text-[11px] text-muted">{msg}</p>}
    </div>
  );
}

export default function SettingsModal() {
  const open = useStore((s) => s.settingsOpen);
  const close = useStore((s) => s.closeSettings);
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);
  const providers = useStore((s) => s.providers);
  const addProvider = useStore((s) => s.addProvider);
  const importCredentials = useStore((s) => s.importCredentials);
  const vaultLocked = useStore((s) => s.vaultLocked);
  const setVaultPassphrase = useStore((s) => s.setVaultPassphrase);
  const disableVaultEncryption = useStore((s) => s.disableVaultEncryption);
  const openUnlock = useStore((s) => s.openUnlock);
  const theme = useStore((s) => s.theme);
  const setTheme = useStore((s) => s.setTheme);
  const accent = useStore((s) => s.accent);
  const setAccent = useStore((s) => s.setAccent);
  // eslint-disable-next-line no-unused-vars
  const vaultTick = useStore((s) => s.vaultTick); // re-render on key/mode changes

  const fileRef = useRef(null);
  const [pass, setPass] = useState("");
  const [importMsg, setImportMsg] = useState("");
  const encrypted = vault.isEncrypted();

  const existingIds = new Set(providers.map((p) => p.id));

  const quickAdd = (preset) => addProvider(presetToProvider(preset));

  const onImportFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file
    if (!file) return;
    try {
      const text = await file.text();
      const { providerCount, keyCount } = await importCredentials(text, file.name);
      setImportMsg(`Imported ${providerCount} provider(s), ${keyCount} key(s).`);
    } catch (err) {
      setImportMsg(err.message || "Import failed.");
    }
    setTimeout(() => setImportMsg(""), 4000);
  };

  const setPassphrase = async () => {
    if (!pass) return;
    await setVaultPassphrase(pass);
    setPass("");
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="Providers & Settings"
      subtitle="Connect any OpenAI-compatible endpoints. Everything stays in your browser."
      footer={
        <button
          onClick={close}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-fg transition hover:opacity-90"
        >
          Done
        </button>
      }
    >
      {/* Providers */}
      <Section
        title="Providers"
        action={
          <button
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs text-muted transition hover:border-accent hover:text-text"
            title="Import from .json or .env"
          >
            <Icon.Upload width={13} height={13} />
            Import
          </button>
        }
      >
        <input
          ref={fileRef}
          type="file"
          accept=".json,.env,application/json,text/plain"
          className="hidden"
          onChange={onImportFile}
        />
        {importMsg && (
          <p className="mb-2 rounded-lg border border-border bg-surface-2/40 px-3 py-2 text-xs text-muted">
            {importMsg}
          </p>
        )}

        {providers.map((p) => (
          <ProviderCard key={p.id} provider={p} vaultLocked={vaultLocked} />
        ))}

        {/* Quick add from presets */}
        <div className="mt-1 flex flex-wrap gap-1.5">
          {PROVIDER_PRESETS.filter((p) => !existingIds.has(p.id)).map((p) => (
            <button
              key={p.id}
              onClick={() => quickAdd(p)}
              className="rounded-lg border border-border px-2.5 py-1 text-xs text-muted transition hover:border-accent hover:text-text"
            >
              + {p.label}
            </button>
          ))}
          <button
            onClick={() =>
              addProvider({ label: "Custom", baseUrl: "", models: [] })
            }
            className="rounded-lg border border-dashed border-border px-2.5 py-1 text-xs text-muted transition hover:border-accent hover:text-text"
          >
            + Custom
          </button>
        </div>
      </Section>

      {/* Security */}
      <Section title="Key security">
        {vaultLocked ? (
          <div className="flex items-center justify-between rounded-lg border border-border bg-surface-2/30 px-3 py-2.5 text-sm">
            <span className="flex items-center gap-2 text-muted">
              <Icon.Lock width={15} height={15} />
              Keys are encrypted and locked.
            </span>
            <button
              onClick={openUnlock}
              className="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-accent-fg transition hover:opacity-90"
            >
              Unlock
            </button>
          </div>
        ) : encrypted ? (
          <div className="flex items-center justify-between rounded-lg border border-success/30 bg-success/[0.06] px-3 py-2.5 text-sm">
            <span className="flex items-center gap-2 text-text">
              <Icon.Check width={15} height={15} className="text-success" />
              Keys encrypted with your passphrase.
            </span>
            <button
              onClick={disableVaultEncryption}
              className="rounded-lg px-3 py-1.5 text-xs text-muted transition hover:text-danger"
            >
              Turn off
            </button>
          </div>
        ) : (
          <div>
            <div className="flex gap-2">
              <input
                type="password"
                className={inputCls}
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && setPassphrase()}
                placeholder="Set a passphrase to encrypt keys"
              />
              <button
                onClick={setPassphrase}
                disabled={!pass}
                className="shrink-0 rounded-lg border border-border px-3 text-xs text-muted transition hover:border-accent hover:text-text disabled:opacity-40"
              >
                Encrypt
              </button>
            </div>
            <p className="mt-1 text-xs text-muted">
              Recommended. Keys are stored as ciphertext and unlocked once per
              session. Without a passphrase they are saved in readable form.
            </p>
          </div>
        )}
      </Section>

      {/* Generation defaults */}
      <Section title="Generation">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Temperature" desc="0 = precise, 2 = creative">
            <input
              className={inputCls}
              type="number"
              min="0"
              max="2"
              step="0.1"
              value={settings.temperature}
              onChange={(e) =>
                updateSettings({
                  temperature: clampNum(e.target.value, 0, 2, 0.7),
                })
              }
            />
          </Field>
          <Field label="Max tokens" desc="0 = provider default">
            <input
              className={inputCls}
              type="number"
              min="0"
              step="64"
              value={settings.maxTokens}
              onChange={(e) =>
                updateSettings({ maxTokens: Math.max(0, parseInt(e.target.value) || 0) })
              }
            />
          </Field>
        </div>
        <Field label="System prompt" desc="Sent at the start of every request.">
          <textarea
            className={clsx(inputCls, "min-h-[72px] resize-y")}
            value={settings.systemPrompt}
            onChange={(e) => updateSettings({ systemPrompt: e.target.value })}
            placeholder="You are a helpful assistant."
          />
        </Field>
      </Section>

      {/* Appearance */}
      <Section title="Appearance">
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
      </Section>
    </Modal>
  );
}

function clampNum(v, min, max, fallback) {
  const n = parseFloat(v);
  if (Number.isNaN(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}
