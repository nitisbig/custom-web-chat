import { useEffect } from "react";
import { useStore } from "./store.js";
import Sidebar from "./components/Sidebar.jsx";
import ChatView from "./components/ChatView.jsx";
import Composer from "./components/Composer.jsx";
import SettingsModal from "./components/SettingsModal.jsx";
import PluginsPanel from "./components/PluginsPanel.jsx";
import UnlockModal from "./components/UnlockModal.jsx";
import ModelPicker from "./components/ModelPicker.jsx";
import { Icon } from "./components/Icons.jsx";

function TopBar() {
  const toggleSidebar = useStore((s) => s.toggleSidebar);
  const openSettings = useStore((s) => s.openSettings);
  const clearActive = useStore((s) => s.clearActiveConversation);
  const convo = useStore((s) => s.activeConversation());
  const hasMessages = (convo?.messages?.length || 0) > 0;

  return (
    <header className="relative z-30 flex items-center justify-between gap-3 border-b border-border bg-surface/60 px-4 py-3 backdrop-blur-md">
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
        <ModelPicker />

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
      <UnlockModal />
    </div>
  );
}
