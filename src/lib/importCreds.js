// Parse credentials from a JSON providers file or a .env file into a normalized
// shape the store can merge: { providers: Provider[], secrets: {id: apiKey} }.
//
// JSON shape (either a bare array or { providers: [...] }):
//   { "providers": [
//       { "id": "openai", "label": "OpenAI", "baseUrl": "...",
//         "apiKey": "sk-...", "models": ["gpt-4o-mini", "gpt-4o"] }
//   ] }
//
// .env: standard provider keys (OPENAI_API_KEY, GROQ_API_KEY, …) map onto
// presets. Generic <ID>_API_KEY / <ID>_BASE_URL / <ID>_MODEL are also honored.

import { PROVIDER_PRESETS, ENV_KEY_MAP, presetToProvider } from "./presets.js";

function presetById(id) {
  return PROVIDER_PRESETS.find((p) => p.id === id);
}

function baseProvider(id) {
  const preset = presetById(id);
  if (preset) return presetToProvider(preset);
  return { id, label: id, baseUrl: "", models: [], needsKey: true };
}

function normalizeModels(models) {
  if (!models) return [];
  const arr = Array.isArray(models) ? models : [models];
  return Array.from(
    new Set(arr.map((m) => (typeof m === "string" ? m : m?.id)).filter(Boolean))
  );
}

/** Parse a providers JSON document. Throws on invalid JSON. */
export function parseProvidersJson(text) {
  const doc = JSON.parse(text);
  const list = Array.isArray(doc) ? doc : doc?.providers;
  if (!Array.isArray(list)) {
    throw new Error('Expected a "providers" array in the JSON file.');
  }

  const providers = [];
  const secrets = {};
  for (const raw of list) {
    if (!raw || typeof raw !== "object") continue;
    const id = String(raw.id || raw.label || "").trim().toLowerCase().replace(/\s+/g, "-");
    if (!id) continue;

    const prov = baseProvider(id);
    if (raw.label) prov.label = String(raw.label);
    if (raw.baseUrl) prov.baseUrl = String(raw.baseUrl);
    if (typeof raw.needsKey === "boolean") prov.needsKey = raw.needsKey;
    const models = normalizeModels(raw.models);
    if (models.length) prov.models = models;

    providers.push(prov);
    if (raw.apiKey) secrets[id] = String(raw.apiKey);
  }
  return { providers, secrets };
}

function parseEnvLines(text) {
  const out = {};
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const m = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    let value = m[2].trim();
    // Strip surrounding quotes and trailing inline comments on unquoted values.
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    } else {
      value = value.replace(/\s+#.*$/, "").trim();
    }
    out[m[1]] = value;
  }
  return out;
}

/** Parse a .env document into providers + secrets. */
export function parseEnv(text) {
  const vars = parseEnvLines(text);

  // Accumulate per-provider fields keyed by provider id.
  const acc = {}; // id -> { apiKey?, baseUrl?, model? }
  const touch = (id) => (acc[id] = acc[id] || {});

  for (const [name, value] of Object.entries(vars)) {
    if (!value) continue;
    if (ENV_KEY_MAP[name]) {
      touch(ENV_KEY_MAP[name]).apiKey = value;
      continue;
    }
    let m;
    if ((m = name.match(/^(.+)_API_KEY$/))) {
      touch(m[1].toLowerCase()).apiKey = value;
    } else if ((m = name.match(/^(.+)_BASE_URL$/))) {
      touch(m[1].toLowerCase()).baseUrl = value;
    } else if ((m = name.match(/^(.+)_MODEL$/))) {
      touch(m[1].toLowerCase()).model = value;
    }
  }

  const providers = [];
  const secrets = {};
  for (const [id, fields] of Object.entries(acc)) {
    const prov = baseProvider(id);
    if (fields.baseUrl) prov.baseUrl = fields.baseUrl;
    if (fields.model) prov.models = normalizeModels([...prov.models, fields.model]);
    providers.push(prov);
    if (fields.apiKey) secrets[id] = fields.apiKey;
  }
  return { providers, secrets };
}

/** Detect format from filename/content and parse accordingly. */
export function parseCredentials(text, filename = "") {
  const looksJson =
    /\.json$/i.test(filename) || text.trim().startsWith("{") || text.trim().startsWith("[");
  return looksJson ? parseProvidersJson(text) : parseEnv(text);
}
