import { create } from "zustand";
import {
  KEYS,
  readJSON,
  writeJSON,
  readString,
  writeString,
} from "./lib/storage";
import {
  DEFAULT_SETTINGS,
  DEFAULT_PROVIDERS,
  DEFAULT_DEFAULTS,
  PROVIDER_PRESETS,
} from "./lib/presets";
import { streamChat, fetchModels, ApiError } from "./lib/api";
import * as vault from "./lib/vault";
import { parseCredentials } from "./lib/importCreds";
import {
  applyOutgoingTransforms,
  collectCommands,
  defaultEnabledIds,
} from "./plugins";

const uid = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

function newConversation(defaults) {
  return {
    id: uid(),
    title: "New chat",
    messages: [], // { id, role, content, error?, note? }
    providerId: defaults?.providerId || "",
    model: defaults?.model || "",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

function loadSettings() {
  const stored = readJSON(KEYS.settings, {});
  return {
    systemPrompt: stored.systemPrompt ?? DEFAULT_SETTINGS.systemPrompt,
    temperature:
      typeof stored.temperature === "number"
        ? stored.temperature
        : DEFAULT_SETTINGS.temperature,
    maxTokens:
      typeof stored.maxTokens === "number"
        ? stored.maxTokens
        : DEFAULT_SETTINGS.maxTokens,
  };
}

// First-run seed / one-time migration from the old single-config `settings`.
function migrateLegacy() {
  const legacy = readJSON(KEYS.settings, null);
  if (legacy && legacy.baseUrl && legacy.model) {
    const preset = PROVIDER_PRESETS.find((p) => p.baseUrl === legacy.baseUrl);
    const id = preset ? preset.id : "legacy";
    const provider = {
      id,
      label: preset ? preset.label : "Imported",
      baseUrl: legacy.baseUrl,
      models: [legacy.model],
      needsKey: preset ? preset.needsKey : !!legacy.apiKey,
    };
    return {
      providers: [provider],
      defaults: { providerId: id, model: legacy.model },
      secret: legacy.apiKey ? { id, key: legacy.apiKey } : null,
    };
  }
  return {
    providers: DEFAULT_PROVIDERS,
    defaults: DEFAULT_DEFAULTS,
    secret: null,
  };
}

function deriveDefaults(providers) {
  const first = providers[0];
  return {
    providerId: first?.id || "",
    model: first?.models?.[0] || "",
  };
}

function loadConversations(defaults) {
  const stored = readJSON(KEYS.conversations, null);
  if (Array.isArray(stored) && stored.length) {
    // Backfill provider/model on conversations from before this feature.
    return stored.map((c) => ({
      ...c,
      providerId: c.providerId || defaults.providerId,
      model: c.model || defaults.model,
    }));
  }
  return [newConversation(defaults)];
}

function loadActiveId(convos) {
  const stored = readString(KEYS.activeId, "");
  if (stored && convos.some((c) => c.id === stored)) return stored;
  return convos[0].id;
}

function deriveTitle(text) {
  const t = text.trim().replace(/\s+/g, " ");
  return t.length > 40 ? t.slice(0, 40) + "…" : t || "New chat";
}

export const useStore = create((set, get) => ({
  // ---- persisted core state ----
  settings: loadSettings(), // global gen params: systemPrompt/temperature/maxTokens
  providers: [],
  defaults: DEFAULT_DEFAULTS,
  conversations: [],
  activeId: null,
  theme: readString(KEYS.theme, "dark"),
  accent: readString(KEYS.accent, "indigo"),
  enabledPlugins: readJSON(KEYS.plugins, null) || defaultEnabledIds(),

  // ---- ephemeral UI state ----
  streaming: false,
  abortCtrl: null,
  composer: "",
  settingsOpen: false,
  pluginsOpen: false,
  unlockOpen: false,
  vaultLocked: false,
  vaultTick: 0, // bumped when secrets change, to nudge dependent components
  sidebarOpen: true,

  // ---- init ----
  init() {
    vault.initVault();

    let providers = readJSON(KEYS.providers, null);
    let defaults = readJSON(KEYS.defaults, null);

    if (!Array.isArray(providers) || !providers.length) {
      const mig = migrateLegacy();
      providers = mig.providers;
      defaults = defaults || mig.defaults;
      writeJSON(KEYS.providers, providers);
      writeJSON(KEYS.defaults, defaults);
      if (mig.secret) vault.setSecret(mig.secret.id, mig.secret.key);
    }
    if (!defaults || !defaults.providerId) {
      defaults = deriveDefaults(providers);
      writeJSON(KEYS.defaults, defaults);
    }

    const conversations = loadConversations(defaults);
    const activeId = loadActiveId(conversations);
    // Persist any backfilled conversation fields.
    writeJSON(KEYS.conversations, conversations);

    set({
      providers,
      defaults,
      conversations,
      activeId,
      vaultLocked: vault.isLocked(),
    });
    get().applyTheme();
  },

  // ---- selectors ----
  activeConversation() {
    const { conversations, activeId } = get();
    return conversations.find((c) => c.id === activeId) || conversations[0];
  },

  resolveProvider(convo) {
    const { providers, defaults } = get();
    const wantId = convo?.providerId || defaults.providerId;
    return (
      providers.find((p) => p.id === wantId) ||
      providers.find((p) => p.id === defaults.providerId) ||
      providers[0] ||
      null
    );
  },

  // The resolved { baseUrl, apiKey, model, ... } for the active conversation,
  // shaped exactly like streamChat expects. apiKey may be "" if locked/unset.
  effectiveSettings() {
    const convo = get().activeConversation();
    const provider = get().resolveProvider(convo);
    const model = (convo && convo.model) || get().defaults.model;
    const s = get().settings;
    return {
      baseUrl: provider?.baseUrl || "",
      apiKey: provider ? vault.getSecret(provider.id) : "",
      model: model || "",
      systemPrompt: s.systemPrompt,
      temperature: s.temperature,
      maxTokens: s.maxTokens,
      providerId: provider?.id || "",
      providerLabel: provider?.label || "",
    };
  },

  // ---- theming ----
  applyTheme() {
    const { theme, accent } = get();
    const el = document.documentElement;
    el.setAttribute("data-theme", theme);
    el.setAttribute("data-accent", accent);
  },
  setTheme(theme) {
    set({ theme });
    writeString(KEYS.theme, theme);
    get().applyTheme();
  },
  setAccent(accent) {
    set({ accent });
    writeString(KEYS.accent, accent);
    get().applyTheme();
  },

  // ---- settings (global gen params) ----
  updateSettings(patch) {
    const settings = { ...get().settings, ...patch };
    set({ settings });
    writeJSON(KEYS.settings, settings);
  },
  openSettings() {
    set({ settingsOpen: true });
  },
  closeSettings() {
    set({ settingsOpen: false });
  },
  openPlugins() {
    set({ pluginsOpen: true });
  },
  closePlugins() {
    set({ pluginsOpen: false });
  },
  openUnlock() {
    set({ unlockOpen: true });
  },
  closeUnlock() {
    set({ unlockOpen: false });
  },
  toggleSidebar() {
    set({ sidebarOpen: !get().sidebarOpen });
  },

  // ---- providers ----
  persistProviders() {
    writeJSON(KEYS.providers, get().providers);
  },
  persistDefaults() {
    writeJSON(KEYS.defaults, get().defaults);
  },

  addProvider(partial = {}) {
    const id = partial.id || "prov-" + uid();
    const provider = {
      id,
      label: partial.label || id,
      baseUrl: partial.baseUrl || "",
      models: partial.models || [],
      needsKey: partial.needsKey !== false,
    };
    set((s) => ({ providers: [...s.providers, provider] }));
    get().persistProviders();
    return id;
  },

  updateProvider(id, patch) {
    set((s) => ({
      providers: s.providers.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    }));
    get().persistProviders();
  },

  removeProvider(id) {
    vault.removeSecret(id);
    set((s) => ({ providers: s.providers.filter((p) => p.id !== id) }));
    // Repoint defaults if they referenced the removed provider.
    if (get().defaults.providerId === id) {
      set({ defaults: deriveDefaults(get().providers) });
      get().persistDefaults();
    }
    get().persistProviders();
    set((s) => ({ vaultTick: s.vaultTick + 1 }));
  },

  async setProviderKey(id, key) {
    await vault.setSecret(id, key);
    set((s) => ({ vaultTick: s.vaultTick + 1 }));
  },

  // Fetch the provider's model list and merge with any manual entries.
  async fetchProviderModels(id) {
    const provider = get().providers.find((p) => p.id === id);
    if (!provider) return [];
    const models = await fetchModels({
      baseUrl: provider.baseUrl,
      apiKey: vault.getSecret(id),
    });
    const merged = Array.from(new Set([...(provider.models || []), ...models]));
    get().updateProvider(id, { models: merged });
    return models;
  },

  setDefaults(providerId, model) {
    const defaults = { providerId, model };
    set({ defaults });
    get().persistDefaults();
  },

  // ---- vault / passphrase ----
  async unlockVault(passphrase) {
    await vault.unlock(passphrase);
    set((s) => ({
      vaultLocked: vault.isLocked(),
      unlockOpen: false,
      vaultTick: s.vaultTick + 1,
    }));
  },
  async setVaultPassphrase(passphrase) {
    await vault.setPassphrase(passphrase);
    set((s) => ({ vaultLocked: false, vaultTick: s.vaultTick + 1 }));
  },
  async disableVaultEncryption() {
    await vault.disableEncryption();
    set((s) => ({ vaultLocked: false, vaultTick: s.vaultTick + 1 }));
  },

  // ---- credential import ----
  async importCredentials(text, filename) {
    const { providers, secrets } = parseCredentials(text, filename);
    const hasSecrets = Object.keys(secrets).length > 0;
    if (hasSecrets && vault.isLocked()) {
      set({ unlockOpen: true });
      throw new Error("Unlock the vault before importing keys.");
    }

    const cur = [...get().providers];
    for (const p of providers) {
      const i = cur.findIndex((x) => x.id === p.id);
      if (i >= 0) {
        cur[i] = {
          ...cur[i],
          ...p,
          models: Array.from(
            new Set([...(cur[i].models || []), ...(p.models || [])])
          ),
        };
      } else {
        cur.push(p);
      }
    }
    set({ providers: cur });
    get().persistProviders();

    if (hasSecrets) {
      await vault.importSecrets(secrets);
      set((s) => ({ vaultTick: s.vaultTick + 1 }));
    }
    return {
      providerCount: providers.length,
      keyCount: Object.keys(secrets).length,
    };
  },

  // ---- plugins ----
  togglePlugin(id) {
    const cur = get().enabledPlugins;
    const next = cur.includes(id)
      ? cur.filter((x) => x !== id)
      : [...cur, id];
    set({ enabledPlugins: next });
    writeJSON(KEYS.plugins, next);
  },

  // ---- composer ----
  setComposer(text) {
    set({ composer: text });
  },

  // ---- conversation management ----
  persistConversations() {
    writeJSON(KEYS.conversations, get().conversations);
  },

  createConversation() {
    const convo = newConversation(get().defaults);
    set((s) => ({
      conversations: [convo, ...s.conversations],
      activeId: convo.id,
      composer: "",
    }));
    writeString(KEYS.activeId, convo.id);
    get().persistConversations();
  },

  selectConversation(id) {
    set({ activeId: id });
    writeString(KEYS.activeId, id);
  },

  deleteConversation(id) {
    let convos = get().conversations.filter((c) => c.id !== id);
    if (convos.length === 0) convos = [newConversation(get().defaults)];
    let activeId = get().activeId;
    if (activeId === id) activeId = convos[0].id;
    set({ conversations: convos, activeId });
    writeString(KEYS.activeId, activeId);
    get().persistConversations();
  },

  renameConversation(id, title) {
    set((s) => ({
      conversations: s.conversations.map((c) =>
        c.id === id ? { ...c, title: title || "Untitled" } : c
      ),
    }));
    get().persistConversations();
  },

  clearActiveConversation() {
    const id = get().activeId;
    set((s) => ({
      conversations: s.conversations.map((c) =>
        c.id === id
          ? { ...c, messages: [], title: "New chat", updatedAt: Date.now() }
          : c
      ),
    }));
    get().persistConversations();
  },

  // Set the provider+model for a conversation, and remember it as the default.
  setConversationModel(convoId, providerId, model) {
    set((s) => ({
      conversations: s.conversations.map((c) =>
        c.id === convoId ? { ...c, providerId, model } : c
      ),
    }));
    get().persistConversations();
    get().setDefaults(providerId, model);
  },

  // ---- message helpers ----
  _mutateActive(fn) {
    const id = get().activeId;
    set((s) => ({
      conversations: s.conversations.map((c) =>
        c.id === id ? fn({ ...c }) : c
      ),
    }));
  },

  addSystemNote(text) {
    get()._mutateActive((c) => {
      c.messages = [
        ...c.messages,
        { id: uid(), role: "note", content: text },
      ];
      c.updatedAt = Date.now();
      return c;
    });
    get().persistConversations();
  },

  // ---- plugin context handed to command/transform hooks ----
  _pluginCtx() {
    const s = get();
    return {
      getState: get,
      settings: get().effectiveSettings(),
      updateSettings: s.updateSettings,
      getComposer: () => get().composer,
      setComposer: s.setComposer,
      newConversation: s.createConversation,
      clearConversation: s.clearActiveConversation,
      addSystemNote: s.addSystemNote,
      sendMessage: (text) => get().send(text),
    };
  },

  // ---- the main send flow ----
  async send(rawText) {
    const state = get();
    if (state.streaming) return;

    const text = (rawText ?? state.composer).trim();
    if (!text) return;

    // Slash command interception.
    if (text.startsWith("/")) {
      const [word, ...rest] = text.slice(1).split(/\s+/);
      const commands = collectCommands(state.enabledPlugins);
      const hit = commands.get(word.toLowerCase());
      if (hit) {
        set({ composer: "" });
        try {
          await hit.command.run(rest.join(" "), get()._pluginCtx());
        } catch (err) {
          get().addSystemNote(`Command /${word} failed: ${err.message}`);
        }
        return;
      }
      // Unknown command → fall through and send as a normal message.
    }

    // Resolve the provider + model + key for the active conversation.
    const convo = get().activeConversation();
    const provider = get().resolveProvider(convo);
    const model = (convo && convo.model) || get().defaults.model;

    if (!provider || !provider.baseUrl || !model) {
      set({ settingsOpen: true });
      return;
    }
    if (provider.needsKey) {
      if (vault.isLocked()) {
        get().addSystemNote(
          `Unlock your saved keys to use ${provider.label}.`
        );
        set({ unlockOpen: true });
        return;
      }
      if (!vault.getSecret(provider.id)) {
        get().addSystemNote(`No API key set for ${provider.label}.`);
        set({ settingsOpen: true });
        return;
      }
    }

    const effSettings = {
      baseUrl: provider.baseUrl,
      apiKey: vault.getSecret(provider.id),
      model,
      systemPrompt: state.settings.systemPrompt,
      temperature: state.settings.temperature,
      maxTokens: state.settings.maxTokens,
    };

    // Append user message; set title if first message.
    const userMsg = { id: uid(), role: "user", content: text };
    const isFirst = get().activeConversation().messages.length === 0;
    get()._mutateActive((c) => {
      c.messages = [...c.messages, userMsg];
      if (isFirst) c.title = deriveTitle(text);
      c.updatedAt = Date.now();
      return c;
    });
    set({ composer: "" });
    get().persistConversations();

    // Placeholder assistant message we stream into.
    const assistantId = uid();
    get()._mutateActive((c) => {
      c.messages = [
        ...c.messages,
        { id: assistantId, role: "assistant", content: "", streaming: true },
      ];
      return c;
    });

    // Build the outgoing payload from real chat turns (exclude notes/errors).
    const activeConvo = get().activeConversation();
    const turns = activeConvo.messages
      .filter((m) => (m.role === "user" || m.role === "assistant") && !m.error)
      .map((m) => ({ role: m.role, content: m.content }))
      .filter((m) => m.content !== ""); // drop the empty placeholder

    let payload = [];
    if (effSettings.systemPrompt && effSettings.systemPrompt.trim()) {
      payload.push({ role: "system", content: effSettings.systemPrompt.trim() });
    }
    payload.push(...turns);
    payload = applyOutgoingTransforms(
      payload,
      state.enabledPlugins,
      get()._pluginCtx()
    );

    const abortCtrl = new AbortController();
    set({ streaming: true, abortCtrl });

    const patchAssistant = (patch) => {
      get()._mutateActive((c) => {
        c.messages = c.messages.map((m) =>
          m.id === assistantId ? { ...m, ...patch } : m
        );
        c.updatedAt = Date.now();
        return c;
      });
    };

    try {
      const full = await streamChat({
        settings: effSettings,
        messages: payload,
        signal: abortCtrl.signal,
        onDelta: (_delta, acc) => patchAssistant({ content: acc }),
      });
      patchAssistant({
        content: full || "*(empty response)*",
        streaming: false,
      });
    } catch (err) {
      const aborted = err.name === "AbortError";
      const existing =
        get()
          .activeConversation()
          .messages.find((m) => m.id === assistantId)?.content || "";
      if (aborted) {
        patchAssistant({
          content: existing || "⏹ Stopped.",
          streaming: false,
        });
      } else {
        const msg =
          err instanceof ApiError ? err.message : "Error: " + err.message;
        patchAssistant({
          content: existing,
          streaming: false,
          error: msg,
        });
      }
    } finally {
      set({ streaming: false, abortCtrl: null });
      get().persistConversations();
    }
  },

  stop() {
    const { abortCtrl } = get();
    if (abortCtrl) abortCtrl.abort();
  },

  // Remove a single message (e.g. a failed turn) and retry the last user msg.
  retryLast() {
    const convo = get().activeConversation();
    const msgs = convo.messages;
    // find last user message
    let lastUser = null;
    for (let i = msgs.length - 1; i >= 0; i--) {
      if (msgs[i].role === "user") {
        lastUser = msgs[i];
        break;
      }
    }
    if (!lastUser) return;
    // Trim everything after (and including) the assistant reply to that user msg.
    const idx = msgs.indexOf(lastUser);
    get()._mutateActive((c) => {
      c.messages = c.messages.slice(0, idx); // drop last user + its reply
      return c;
    });
    get().send(lastUser.content);
  },
}));
