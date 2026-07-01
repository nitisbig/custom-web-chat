import { useEffect } from "react";
import { useStore } from "./store.js";
import Sidebar from "./components/Sidebar.jsx";
import ChatView from "./components/ChatView.jsx";
import Composer from "./components/Composer.jsx";
import SettingsModal from "./components/SettingsModal.jsx";
import PluginsPanel from "./components/PluginsPanel.jsx";
import { Icon } from "./components/Icons.jsx";

function TopBar() {
  const toggleSidebar = useStore((s) => s.toggleSidebar);
  const openSettings = useStore((s) => s.openSettings);
  const settings = useStore((s) => s.settings);
  const clearActive = useStore((s) => s.clearActiveConversation);
  const convo = useStore((s) => s.activeConversation());
  const hasMessages = (convo?.messages?.length || 0) > 0;

  return (
    <header className="flex items-center justify-between gap-3 border-b border-border bg-surface/60 px-4 py-3 backdrop-blur-md">
      <div className="flex items-center gap-2">
        <button
          onClick={toggleSidebar}
          className="rounded-lg p-2 text-muted transition hover:bg-surface-2 hover:text-text"
          title="Toggle sidebar"
        >
          <Icon.Menu width={18} height={18} />
        </button>
        <span className="max-w-[40vw] truncate font-display text-base font-medium">
          {convo?.title || "Nexus"}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={openSettings}
          className="hidden items-center gap-1.5 rounded-lg border border-border bg-surface-2/50 px-2.5 py-1.5 text-xs text-muted transition hover:border-accent hover:text-text sm:flex"
          title="Model"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-success" />
          <span className="max-w-[180px] truncate">
            {settings.model || "no model set"}
          </span>
        </button>

        {hasMessages && (
          <button
            onClick={clearActive}
            className="rounded-lg p-2 text-muted transition hover:bg-surface-2 hover:text-danger"
            title="Clear conversation"
          >
            <Icon.Trash width={17} height={17} />
          </button>
        )}

        <button
          onClick={openSettings}
          className="rounded-lg p-2 text-muted transition hover:bg-surface-2 hover:text-text"
          title="Settings"
        >
          <Icon.Settings width={18} height={18} />
        </button>
      </div>
    </header>
  );
}

export default function App() {
  const init = useStore((s) => s.init);

  useEffect(() => {
    init();
  }, [init]);

  return (
    <div className="app-atmosphere flex h-full overflow-hidden">
      <Sidebar />
      <div className="relative z-[1] flex min-w-0 flex-1 flex-col">
        <TopBar />
        <ChatView />
        <Composer />
      </div>

      <SettingsModal />
      <PluginsPanel />
    </div>
  );
}
