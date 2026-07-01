// Thin, defensive localStorage wrapper. All persistence keys live here.

const PREFIX = "nexus.";

export const KEYS = {
  settings: PREFIX + "settings.v2",
  conversations: PREFIX + "conversations.v2",
  activeId: PREFIX + "activeId.v2",
  theme: PREFIX + "theme.v2",
  accent: PREFIX + "accent.v2",
  plugins: PREFIX + "plugins.v2",
  providers: PREFIX + "providers.v3",
  vault: PREFIX + "vault.v3",
  defaults: PREFIX + "defaults.v3",
};

export function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or unavailable — fail silently; app still works in-memory.
  }
}

export function readString(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw == null ? fallback : raw;
  } catch {
    return fallback;
  }
}

export function writeString(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}
