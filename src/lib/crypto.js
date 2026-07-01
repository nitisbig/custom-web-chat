// AES-GCM encryption with a PBKDF2-derived key. Uses the browser Web Crypto
// API only — no dependencies. Used by vault.js to protect API keys at rest.

const enc = new TextEncoder();
const dec = new TextDecoder();

const PBKDF2_ITERATIONS = 150_000;

export function randomBytes(len) {
  const a = new Uint8Array(len);
  crypto.getRandomValues(a);
  return a;
}

export function toB64(bytes) {
  const arr = new Uint8Array(bytes);
  let bin = "";
  for (let i = 0; i < arr.length; i++) bin += String.fromCharCode(arr[i]);
  return btoa(bin);
}

export function fromB64(b64) {
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}

/** Derive a 256-bit AES-GCM key from a passphrase + salt. */
export async function deriveKey(passphrase, saltBytes) {
  const baseKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: saltBytes,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

/** Encrypt an object → { iv, ct } (both base64). */
export async function encryptJSON(key, obj) {
  const iv = randomBytes(12);
  const plaintext = enc.encode(JSON.stringify(obj));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plaintext);
  return { iv: toB64(iv), ct: toB64(ct) };
}

/** Decrypt a { iv, ct } blob back into an object. Throws if the key is wrong. */
export async function decryptJSON(key, blob) {
  const iv = fromB64(blob.iv);
  const ct = fromB64(blob.ct);
  const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
  return JSON.parse(dec.decode(plaintext));
}
