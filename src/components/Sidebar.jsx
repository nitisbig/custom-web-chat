import { useState } from "react";
import { useStore } from "../store.js";
import { Icon } from "./Icons.jsx";
import clsx from "clsx";

function ConversationRow({ convo, active, onSelect, onDelete, onRename }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(convo.title);

  const commit = () => {
    setEditing(false);
    const t = draft.trim();
    if (t && t !== convo.title) onRename(convo.id, t);
    else setDraft(convo.title);
  };

  return (
    <div
      className={clsx(
        "group flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition cursor-pointer",
        active
          ? "bg-surface-2 text-text"
          : "text-muted hover:bg-surface-2/60 hover:text-text"
      )}
      onClick={() => onSelect(convo.id)}
    >
      <span
        className={clsx(
          "h-1.5 w-1.5 shrink-0 rounded-full transition",
          active ? "bg-accent" : "bg-transparent"
        )}
      />
      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") {
              setDraft(convo.title);
              setEditing(false);
            }
          }}
          onClick={(e) => e.stopPropagation()}
          className="flex-1 min-w-0 bg-transparent outline-none border-b border-accent/50"
        />
      ) : (
        <span className="flex-1 truncate">{convo.title}</span>
      )}

      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition">
        <button
          className="rounded p-1 text-muted hover:text-text"
          title="Rename"
          onClick={(e) => {
            e.stopPropagation();
            setDraft(convo.title);
            setEditing(true);
          }}
        >
          <Icon.Edit width={14} height={14} />
        </button>
        <button
          className="rounded p-1 text-muted hover:text-danger"
          title="Delete"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(convo.id);
          }}
        >
          <Icon.Trash width={14} height={14} />
        </button>
      </div>
    </div>
  );
}

export default function Sidebar() {
  const {
    conversations,
    activeId,
    sidebarOpen,
    createConversation,
    selectConversation,
    deleteConversation,
    renameConversation,
    openPlugins,
  } = useStore();

  return (
    <aside
      className={clsx(
        "relative z-10 flex h-full flex-col border-r border-border bg-surface/70 backdrop-blur-md transition-all duration-300 ease-out overflow-hidden",
        sidebarOpen ? "w-72" : "w-0 border-r-0"
      )}
    >
      <div className="flex h-full w-72 flex-col">
        {/* Brand */}
        <div className="flex items-center gap-2.5 px-4 py-4">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent text-accent-fg shadow-soft">
            <span className="font-display text-lg leading-none">◈</span>
          </span>
          <div className="leading-tight">
            <div className="font-display text-lg font-semibold">Nexus</div>
            <div className="text-[11px] text-muted -mt-0.5">
              agnostic AI chat
            </div>
          </div>
        </div>

        {/* New chat */}
        <div className="px-3">
          <button
            onClick={createConversation}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-surface-2/50 px-3 py-2.5 text-sm font-medium text-text transition hover:border-accent hover:bg-surface-2"
          >
            <Icon.Plus width={16} height={16} />
            New chat
          </button>
        </div>

        {/* Conversation list */}
        <div className="mt-4 flex-1 overflow-y-auto px-3 pb-2">
          <div className="mb-1.5 px-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
            History
          </div>
          <div className="flex flex-col gap-0.5">
            {conversations.map((c) => (
              <ConversationRow
                key={c.id}
                convo={c}
                active={c.id === activeId}
                onSelect={selectConversation}
                onDelete={deleteConversation}
                onRename={renameConversation}
              />
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border p-3">
          <button
            onClick={openPlugins}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-muted transition hover:bg-surface-2 hover:text-text"
          >
            <Icon.Puzzle width={16} height={16} />
            Plugins
          </button>
        </div>
      </div>
    </aside>
  );
}
