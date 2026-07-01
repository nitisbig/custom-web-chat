// Secret store for provider API keys. Wraps crypto.js + localStorage.
//
// Two modes:
//   "plain"     — secrets stored readable in localStorage (zero friction).
//   "encrypted" — secrets stored as AES-GCM ciphertext; a passphrase unlocks
//                 them once per session. Decrypted secrets + the derived key
//                 live only in module memory and never touch disk.
//
// The persisted blob (KEYS.vault) is one of:
//   { v, mode: "plain",     secrets: { [providerId]: apiKey } }
//   { v, mode: "encrypted", salt, iv, ct }   // ct decrypts to { secrets }

import { KEYS, readJSON, writeJSON } from "./storage.js";
import {
  deriveKey,
  encryptJSON,
  decryptJSON,
  randomBytes,
  toB64,
  fromB64,
} from "./crypto.js";

const VERSION = 3;

let _mode = "plain"; // "plain" | "encrypted"
let _secrets = {}; // decrypted secrets in memory (empty {} when unlocked-empty)
let _locked = false; // true when encrypted and not yet unlocked this session
let _key = null; // CryptoKey (encrypted mode only)
let _salt = null; // Uint8Array salt (encrypted mode only)

/** Read the persisted blob and set up in-memory state. Call once at startup. */
export function initVault() {
  const blob = readJSON(KEYS.vault, null);
  if (!blob || !blob.mode) {
    _mode = "plain";
    _secrets = {};
    _locked = false;
    return;
  }
  if (blob.mode === "encrypted") {
    _mode = "encrypted";
    _secrets = {};
    _locked = true;
    _salt = blob.salt ? fromB64(blob.salt) : null;
    return;
  }
  _mode = "plain";
  _secrets = blob.secrets || {};
  _locked = false;
}

export function isEncrypted() {
  return _mode === "encrypted";
}
export function isLocked() {
  return _locked;
}
export function hasVault() {
  const blob = readJSON(KEYS.vault, null);
  return !!(blob && blob.mode);
}

function persistPlain() {
  writeJSON(KEYS.vault, { v: VERSION, mode: "plain", secrets: _secrets });
}

async function persistEncrypted() {
  if (!_key || !_salt) throw new Error("Vault is locked.");
  const { iv, ct } = await encryptJSON(_key, { secrets: _secrets });
  writeJSON(KEYS.vault, {
    v: VERSION,
    mode: "encrypted",
    salt: toB64(_salt),
    iv,
    ct,
  });
}

async function persist() {
  if (_mode === "encrypted") await persistEncrypted();
  else persistPlain();
}

/** Decrypt the vault with a passphrase. Throws on the wrong passphrase. */
export async function unlock(passphrase) {
  const blob = readJSON(KEYS.vault, null);
  if (!blob || blob.mode !== "encrypted") {
    _locked = false;
    return true;
  }
  const salt = fromB64(blob.salt);
  const key = await deriveKey(passphrase, salt);
  let payload;
  try {
    payload = await decryptJSON(key, { iv: blob.iv, ct: blob.ct });
  } catch {
    throw new Error("Incorrect passphrase.");
  }
  _key = key;
  _salt = salt;
  _secrets = payload.secrets || {};
  _mode = "encrypted";
  _locked = false;
  return true;
}

/** Turn on encryption: re-encrypt the current in-memory secrets. */
export async function setPassphrase(passphrase) {
  if (_locked) throw new Error("Unlock the vault first.");
  _salt = randomBytes(16);
  _key = await deriveKey(passphrase, _salt);
  _mode = "encrypted";
  _locked = false;
  await persistEncrypted();
}

/** Turn encryption back off, storing secrets in plain mode. */
export async function disableEncryption() {
  if (_locked) throw new Error("Unlock the vault first.");
  _mode = "plain";
  _key = null;
  _salt = null;
  persistPlain();
}

export function getSecret(id) {
  if (_locked) return "";
  return _secrets[id] || "";
}

export function hasSecret(id) {
  return !_locked && !!_secrets[id];
}

export async function setSecret(id, value) {
  if (_locked) throw new Error("Vault is locked.");
  if (value) _secrets[id] = value;
  else delete _secrets[id];
  await persist();
}

export async function removeSecret(id) {
  if (_locked) return;
  delete _secrets[id];
  await persist();
}

/** Merge a { providerId: apiKey } map (used by credential import). */
export async function importSecrets(map) {
  if (_locked) throw new Error("Vault is locked.");
  for (const [id, val] of Object.entries(map || {})) {
    if (val) _secrets[id] = val;
  }
  await persist();
}

export function exportSecrets() {
  if (_locked) return {};
  return { ..._secrets };
}
