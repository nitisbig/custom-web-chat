// Provider presets for OpenAI-compatible chat endpoints.
// Any endpoint exposing POST {baseUrl}/chat/completions works.

export const PROVIDER_PRESETS = [
  {
    id: "openai",
    label: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-4o-mini",
    needsKey: true,
    docs: "https://platform.openai.com/api-keys",
  },
  {
    id: "openrouter",
    label: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    model: "openai/gpt-4o-mini",
    needsKey: true,
    docs: "https://openrouter.ai/keys",
  },
  {
    id: "groq",
    label: "Groq",
    baseUrl: "https://api.groq.com/openai/v1",
    model: "llama-3.3-70b-versatile",
    needsKey: true,
    docs: "https://console.groq.com/keys",
  },
  {
    id: "together",
    label: "Together",
    baseUrl: "https://api.together.xyz/v1",
    model: "meta-llama/Llama-3.3-70B-Instruct-Turbo",
    needsKey: true,
    docs: "https://api.together.xyz/settings/api-keys",
  },
  {
    id: "deepseek",
    label: "DeepSeek",
    baseUrl: "https://api.deepseek.com/v1",
    model: "deepseek-chat",
    needsKey: true,
    docs: "https://platform.deepseek.com/api_keys",
  },
  {
    id: "mistral",
    label: "Mistral",
    baseUrl: "https://api.mistral.ai/v1",
    model: "mistral-small-latest",
    needsKey: true,
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

export const DEFAULT_SETTINGS = {
  baseUrl: "https://api.openai.com/v1",
  apiKey: "",
  model: "gpt-4o-mini",
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
