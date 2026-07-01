import { useStore } from "../store.js";
import Modal from "./Modal.jsx";
import { getAllPlugins } from "../plugins";
import clsx from "clsx";

function Toggle({ on, onClick }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      onClick={onClick}
      className={clsx(
        "relative h-6 w-11 shrink-0 rounded-full transition",
        on ? "bg-accent" : "bg-surface-2 border border-border"
      )}
    >
      <span
        className={clsx(
          "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all",
          on ? "left-[22px]" : "left-0.5"
        )}
      />
    </button>
  );
}

export default function PluginsPanel() {
  const open = useStore((s) => s.pluginsOpen);
  const close = useStore((s) => s.closePlugins);
  const enabled = useStore((s) => s.enabledPlugins);
  const toggle = useStore((s) => s.togglePlugin);

  const plugins = getAllPlugins();

  return (
    <Modal
      open={open}
      onClose={close}
      title="Plugins"
      subtitle="Extend the chat with commands, request transforms, and message actions."
    >
      <div className="flex flex-col gap-2.5 pb-2">
        {plugins.map((p) => {
          const on = enabled.includes(p.id);
          return (
            <div
              key={p.id}
              className={clsx(
                "flex items-start gap-3 rounded-xl border p-4 transition",
                on ? "border-accent/40 bg-accent-soft/[0.05]" : "border-border"
              )}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-text">{p.name}</h3>
                  {p.version && (
                    <span className="rounded bg-surface-2 px-1.5 py-0.5 text-[10px] text-muted">
                      v{p.version}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-muted">{p.description}</p>

                {/* Show what the plugin contributes */}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {(p.commands || []).map((c) => (
                    <span
                      key={c.name}
                      className="rounded-md bg-surface-2 px-2 py-0.5 font-mono text-[11px] text-accent"
                    >
                      /{c.name}
                    </span>
                  ))}
                  {(p.messageActions || []).map((a, i) => (
                    <span
                      key={i}
                      className="rounded-md bg-surface-2 px-2 py-0.5 text-[11px] text-muted"
                    >
                      action: {a.label}
                    </span>
                  ))}
                  {p.transformOutgoing && (
                    <span className="rounded-md bg-surface-2 px-2 py-0.5 text-[11px] text-muted">
                      modifies requests
                    </span>
                  )}
                </div>
              </div>

              <Toggle on={on} onClick={() => toggle(p.id)} />
            </div>
          );
        })}
      </div>

      <p className="border-t border-border pt-3 text-xs text-muted">
        Add your own plugin by dropping an object into{" "}
        <code className="font-mono text-accent">src/plugins/builtins.jsx</code>{" "}
        and registering it.
      </p>
    </Modal>
  );
}
