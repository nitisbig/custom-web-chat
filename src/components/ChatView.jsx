import { useEffect, useRef } from "react";
import { useStore } from "../store.js";
import Message from "./Message.jsx";
import { Icon } from "./Icons.jsx";
import * as vault from "../lib/vault.js";

const STARTERS = [
  "Explain a tricky concept simply",
  "Draft an email to reschedule a meeting",
  "Review this code for bugs",
  "Brainstorm names for a project",
];

function EmptyState() {
  const setComposer = useStore((s) => s.setComposer);
  const openSettings = useStore((s) => s.openSettings);
  const convo = useStore((s) => s.activeConversation());
  const resolveProvider = useStore((s) => s.resolveProvider);
  const vaultLocked = useStore((s) => s.vaultLocked);
  // eslint-disable-next-line no-unused-vars
  const vaultTick = useStore((s) => s.vaultTick);
  const provider = resolveProvider(convo);
  const configured =
    !!provider &&
    !!provider.baseUrl &&
    !!(convo?.model || "") &&
    (!provider.needsKey || (!vaultLocked && vault.hasSecret(provider.id)));

  return (
    <div className="flex h-full flex-col items-center justify-center px-6 text-center">
      <div className="mb-5 grid h-16 w-16 place-items-center rounded-2xl bg-accent text-accent-fg shadow-pop">
        <span className="font-display text-3xl leading-none">◈</span>
      </div>
      <h1 className="font-display text-3xl font-semibold tracking-tight">
        How can I help today?
      </h1>
      <p className="mt-2 max-w-md text-sm text-muted">
        A fast, private chat client for any OpenAI-compatible model — OpenAI,
        OpenRouter, Groq, DeepSeek, local Ollama, and more.
      </p>

      {!configured && (
        <button
          onClick={openSettings}
          className="mt-5 flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-accent-fg transition hover:opacity-90"
        >
          <Icon.Settings width={16} height={16} />
          Connect a provider to begin
        </button>
      )}

      <div className="mt-8 grid w-full max-w-lg grid-cols-1 gap-2.5 sm:grid-cols-2">
        {STARTERS.map((s) => (
          <button
            key={s}
            onClick={() => setComposer(s)}
            className="rounded-xl border border-border bg-surface/60 px-4 py-3 text-left text-sm text-text transition hover:border-accent hover:bg-surface"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function ChatView() {
  const convo = useStore((s) => s.activeConversation());
  const streaming = useStore((s) => s.streaming);
  const scrollRef = useRef(null);
  const bottomRef = useRef(null);

  const messages = convo?.messages || [];
  const count = messages.length;
  const lastLen = messages[count - 1]?.content?.length || 0;

  // Auto-scroll to bottom on new messages / streaming growth.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: streaming ? "auto" : "smooth" });
  }, [count, lastLen, streaming]);

  return (
    <div ref={scrollRef} className="relative flex-1 overflow-y-auto">
      {count === 0 ? (
        <EmptyState />
      ) : (
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 md:px-8">
          {messages.map((m) => (
            <Message key={m.id} message={m} />
          ))}
          <div ref={bottomRef} className="h-px" />
        </div>
      )}
    </div>
  );
}
