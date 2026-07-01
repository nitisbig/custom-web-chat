import { useState } from "react";
import { useStore } from "../store.js";
import Modal from "./Modal.jsx";
import { Icon } from "./Icons.jsx";

// Prompt for the passphrase that decrypts saved API keys. Shown on demand when
// an encrypted vault is locked and a key is needed.
export default function UnlockModal() {
  const open = useStore((s) => s.unlockOpen);
  const close = useStore((s) => s.closeUnlock);
  const unlockVault = useStore((s) => s.unlockVault);

  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!pass) return;
    setBusy(true);
    setErr("");
    try {
      await unlockVault(pass);
      setPass("");
    } catch (e) {
      setErr(e.message || "Could not unlock.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="Unlock saved keys"
      subtitle="Your API keys are encrypted. Enter your passphrase to use them this session."
      footer={
        <>
          <button
            onClick={close}
            className="rounded-lg px-4 py-2 text-sm text-muted transition hover:text-text"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={busy || !pass}
            className="flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-fg transition hover:opacity-90 disabled:opacity-40"
          >
            <Icon.Lock width={15} height={15} />
            {busy ? "Unlocking…" : "Unlock"}
          </button>
        </>
      }
    >
      <input
        autoFocus
        type="password"
        value={pass}
        onChange={(e) => setPass(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        placeholder="Passphrase"
        className="w-full rounded-lg border border-border bg-bg px-3 py-2.5 text-sm text-text outline-none transition focus:border-accent placeholder:text-muted"
      />
      {err && (
        <div className="mt-3 rounded-lg border border-danger/30 bg-danger/[0.06] px-3 py-2 text-sm text-danger">
          {err}
        </div>
      )}
      <p className="mt-3 text-xs text-muted">
        Unlocking keeps your keys in memory only until you close this tab.
      </p>
    </Modal>
  );
}
