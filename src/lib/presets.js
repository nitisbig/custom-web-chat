// Provider presets for OpenAI-compatible chat endpoints.
// Any endpoint exposing POST {baseUrl}/chat/completions works.

export const PROVIDER_PRESETS = [
  {
    id: "openai",
    label: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-4o-mini",
    needsKey: true,
    env: "OPENAI_API_KEY",
    docs: "https://platform.openai.com/api-keys",
  },
  {
    id: "openrouter",
    label: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    model: "openai/gpt-4o-mini",
    needsKey: true,
    env: "OPENROUTER_API_KEY",
    docs: "https://openrouter.ai/keys",
  },
  {
    id: "groq",
    label: "Groq",
    baseUrl: "https://api.groq.com/openai/v1",
    model: "llama-3.3-70b-versatile",
    needsKey: true,
    env: "GROQ_API_KEY",
    docs: "https://console.groq.com/keys",
  },
  {
    id: "together",
    label: "Together",
    baseUrl: "https://api.together.xyz/v1",
    model: "meta-llama/Llama-3.3-70B-Instruct-Turbo",
    needsKey: true,
    env: "TOGETHER_API_KEY",
    docs: "https://api.together.xyz/settings/api-keys",
  },
  {
    id: "deepseek",
    label: "DeepSeek",
    baseUrl: "https://api.deepseek.com/v1",
    model: "deepseek-chat",
    needsKey: true,
    env: "DEEPSEEK_API_KEY",
    docs: "https://platform.deepseek.com/api_keys",
  },
  {
    id: "mistral",
    label: "Mistral",
    baseUrl: "https://api.mistral.ai/v1",
    model: "mistral-small-latest",
    needsKey: true,
    env: "MISTRAL_API_KEY",
    docs: "https://console.mistral.ai/api-keys",
  },
  {
    id: "ollama",
    label: "Ollama",
    baseUrl: "http://localhost:11434/v1",
    model: "llama3.2",
    needsKey: false,
    docs: "https://ollama.com",
  },
  {
    id: "lmstudio",
    label: "LM Studio",
    baseUrl: "http://localhost:1234/v1",
    model: "local-model",
    needsKey: false,
    docs: "https://lmstudio.ai",
  },
];

/** Turn a preset into a provider config object (non-secret). */
export function presetToProvider(p) {
  return {
    id: p.id,
    label: p.label,
    baseUrl: p.baseUrl,
    models: p.model ? [p.model] : [],
    needsKey: !!p.needsKey,
  };
}

/** Fresh installs start with the two most common providers configured. */
export const DEFAULT_PROVIDERS = ["openai", "ollama"]
  .map((id) => PROVIDER_PRESETS.find((p) => p.id === id))
  .map(presetToProvider);

export const DEFAULT_DEFAULTS = {
  providerId: "openai",
  model: "gpt-4o-mini",
};

// Standard .env variable name → preset provider id (for credential import).
export const ENV_KEY_MAP = PROVIDER_PRESETS.reduce((map, p) => {
  if (p.env) map[p.env] = p.id;
  return map;
}, {});

// Global generation params (per-provider config lives in `providers`).
export const DEFAULT_SETTINGS = {
  systemPrompt: "",
  temperature: 0.7,
  maxTokens: 0, // 0 = provider default (omit)
};

export const THEMES = [
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
  { id: "dusk", label: "Dusk" },
  { id: "noir", label: "Noir" },
];

export const ACCENTS = [
  { id: "indigo", label: "Indigo", swatch: "#6366f1" },
  { id: "amber", label: "Amber", swatch: "#d99428" },
  { id: "emerald", label: "Emerald", swatch: "#10a06e" },
  { id: "rose", label: "Rose", swatch: "#e14e6c" },
  { id: "sky", label: "Sky", swatch: "#2896dc" },
];
