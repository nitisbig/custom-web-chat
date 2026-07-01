import { create } from "zustand";
import { KEYS, readJSON, writeJSON, readString, writeString } from "./lib/storage";
import { DEFAULT_SETTINGS } from "./lib/presets";
import { streamChat, ApiError } from "./lib/api";
import {
  applyOutgoingTransforms,
  collectCommands,
  defaultEnabledIds,
} from "./plugins";

const uid = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

function newConversation() {
  return {
    id: uid(),
    title: "New chat",
    messages: [], // { id, role, content, error?, note? }
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

function loadConversations() {
  const stored = readJSON(KEYS.conversations, null);
  if (Array.isArray(stored) && stored.length) return stored;
  return [newConversation()];
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
  settings: { ...DEFAULT_SETTINGS, ...readJSON(KEYS.settings, {}) },
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
  sidebarOpen: true,

  // ---- init ----
  init() {
    const conversations = loadConversations();
    const activeId = loadActiveId(conversations);
    set({ conversations, activeId });
    get().applyTheme();
  },

  // ---- selectors ----
  activeConversation() {
    const { conversations, activeId } = get();
    return conversations.find((c) => c.id === activeId) || conversations[0];
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

  // ---- settings ----
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
  toggleSidebar() {
    set({ sidebarOpen: !get().sidebarOpen });
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
    const convo = newConversation();
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
    if (convos.length === 0) convos = [newConversation()];
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
      settings: s.settings,
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

    const { settings } = state;
    if (!settings.baseUrl || !settings.model) {
      set({ settingsOpen: true });
      return;
    }

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
    const convo = get().activeConversation();
    const turns = convo.messages
      .filter((m) => (m.role === "user" || m.role === "assistant") && !m.error)
      .map((m) => ({ role: m.role, content: m.content }))
      .filter((m) => m.content !== ""); // drop the empty placeholder

    let payload = [];
    if (settings.systemPrompt && settings.systemPrompt.trim()) {
      payload.push({ role: "system", content: settings.systemPrompt.trim() });
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
        settings,
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
