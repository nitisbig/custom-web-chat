// Provider-agnostic chat client for any OpenAI-compatible /chat/completions endpoint.
// Streams tokens via SSE and reports deltas through callbacks.

function joinUrl(baseUrl, path) {
  return baseUrl.replace(/\/+$/, "") + path;
}

function buildBody(settings, messages) {
  const body = {
    model: settings.model,
    messages,
    stream: true,
  };
  if (typeof settings.temperature === "number") {
    body.temperature = settings.temperature;
  }
  if (settings.maxTokens && settings.maxTokens > 0) {
    body.max_tokens = settings.maxTokens;
  }
  return body;
}

/**
 * Stream a chat completion.
 *
 * @param {object}   opts
 * @param {object}   opts.settings   { baseUrl, apiKey, model, temperature, maxTokens }
 * @param {Array}    opts.messages   [{ role, content }]
 * @param {AbortSignal} opts.signal
 * @param {(delta:string, full:string)=>void} opts.onDelta
 * @returns {Promise<string>} the full accumulated text
 */
export async function streamChat({ settings, messages, signal, onDelta }) {
  const url = joinUrl(settings.baseUrl, "/chat/completions");
  const headers = { "Content-Type": "application/json" };
  if (settings.apiKey) headers["Authorization"] = "Bearer " + settings.apiKey;

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(buildBody(settings, messages)),
    signal,
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new ApiError(res.status, res.statusText, detail);
  }

  // Some gateways ignore stream:true and return a normal JSON body.
  const contentType = res.headers.get("content-type") || "";
  if (!res.body || contentType.includes("application/json")) {
    const json = await res.json().catch(() => null);
    const text = json?.choices?.[0]?.message?.content || "";
    if (text) onDelta(text, text);
    return text;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let full = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // SSE events are separated by blank lines; process complete lines only.
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith(":")) continue; // comment/keepalive
      if (!line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (data === "[DONE]") continue;

      let json;
      try {
        json = JSON.parse(data);
      } catch {
        continue; // partial/non-JSON chunk
      }
      const choice = json.choices?.[0];
      const delta = choice?.delta?.content ?? choice?.message?.content ?? "";
      if (delta) {
        full += delta;
        onDelta(delta, full);
      }
    }
  }

  return full;
}

/**
 * Fetch the list of model ids a provider exposes via GET {baseUrl}/models.
 * Tolerant of the common response shapes; throws ApiError on HTTP failure.
 *
 * @param {object} opts
 * @param {string} opts.baseUrl
 * @param {string} [opts.apiKey]
 * @param {AbortSignal} [opts.signal]
 * @returns {Promise<string[]>} sorted, de-duplicated model ids
 */
export async function fetchModels({ baseUrl, apiKey, signal }) {
  const url = joinUrl(baseUrl, "/models");
  const headers = {};
  if (apiKey) headers["Authorization"] = "Bearer " + apiKey;

  const res = await fetch(url, { method: "GET", headers, signal });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new ApiError(res.status, res.statusText, detail);
  }

  const json = await res.json().catch(() => null);
  // OpenAI: { data: [{ id }] }. Some gateways return a bare array or { models }.
  const list = Array.isArray(json)
    ? json
    : json?.data || json?.models || [];
  const ids = list
    .map((m) => (typeof m === "string" ? m : m?.id || m?.name))
    .filter(Boolean);
  return Array.from(new Set(ids)).sort();
}

export class ApiError extends Error {
  constructor(status, statusText, detail) {
    super(formatApiError(status, statusText, detail));
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

function formatApiError(status, statusText, detail) {
  let hint = "";
  if (status === 401) hint = " — check your API key.";
  else if (status === 403) hint = " — key valid but not permitted for this model.";
  else if (status === 404) hint = " — check the Base URL and model name.";
  else if (status === 429) hint = " — rate limited or out of quota.";
  else if (status >= 500) hint = " — the provider had a server error.";

  // Try to pull a human message out of the provider's error JSON.
  let parsed = "";
  try {
    const obj = JSON.parse(detail);
    parsed = obj?.error?.message || obj?.message || "";
  } catch {
    parsed = detail?.slice(0, 300) || "";
  }
  return `HTTP ${status} ${statusText}${hint}${parsed ? "\n\n" + parsed : ""}`;
}
