import { useState, useCallback } from "react";
import type { WorldObject, WorldConfig, ToolType, ObjectId } from "./physics/types";
import { DEFAULT_CONFIG } from "./physics/types";
import { PRESETS } from "./physics/presets";
import { PhysicsCanvas } from "./components/PhysicsCanvas";
import { Toolbar } from "./components/Toolbar";
import { ControlsPanel } from "./components/ControlsPanel";
import { InfoPanel } from "./components/InfoPanel";
import { PresetsPanel } from "./components/PresetsPanel";
import { useDarkMode } from "./hooks/useDarkMode";

export default function App() {
  const isDark = useDarkMode();
  const [objects, setObjects] = useState<WorldObject[]>([]);
  const [config, setConfig] = useState<WorldConfig>({ ...DEFAULT_CONFIG });
  const [activeTool, setActiveTool] = useState<ToolType>("ball");
  const [selectedId, setSelectedId] = useState<ObjectId | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleReset = useCallback(() => {
    setObjects([]);
    setSelectedId(null);
  }, []);

  const handleLoadPreset = useCallback(
    (index: number) => {
      const preset = PRESETS[index];
      if (!preset) return;
      // Use a reasonable default size; the canvas will handle its own sizing
      const w = window.innerWidth * (sidebarOpen ? 0.72 : 0.92);
      const h = window.innerHeight - 120;
      setObjects(preset.create(w, h));
      setSelectedId(null);
      setConfig((prev) => ({ ...prev, showTrails: false }));
      setIsPlaying(true);
    },
    [sidebarOpen],
  );

  return (
    <div
      className="flex flex-col h-screen overflow-hidden"
      style={{ background: "var(--paper)", color: "var(--ink)" }}
    >
      {/* Header */}
      <header
        className="flex items-center justify-between px-4 py-2 shrink-0"
        style={{ borderBottom: "1px solid var(--line)" }}
      >
        <div className="flex items-center gap-3">
          <h1
            className="text-lg font-extrabold tracking-tight"
            style={{ fontFamily: "'Fraunces', serif" }}
          >
            Physics Simulator
          </h1>
          <span
            className="text-xs font-medium px-2 py-0.5 rounded-full"
            style={{
              background: "var(--accent)",
              color: "#fff",
            }}
          >
            FreeAppStore
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Toolbar activeTool={activeTool} onToolChange={setActiveTool} />
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="px-2 py-1 rounded text-xs font-medium cursor-pointer"
            style={{
              border: "1px solid var(--line)",
              background: "var(--panel)",
              color: "var(--ink)",
            }}
          >
            {sidebarOpen ? "Hide Panel" : "Show Panel"}
          </button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex flex-1 min-h-0 p-3 gap-3">
        {/* Canvas area */}
        <PhysicsCanvas
          objects={objects}
          onObjectsChange={setObjects}
          config={config}
          activeTool={activeTool}
          selectedId={selectedId}
          onSelect={setSelectedId}
          isPlaying={isPlaying}
          isDark={isDark}
        />

        {/* Sidebar */}
        {sidebarOpen && (
          <aside className="w-64 shrink-0 flex flex-col gap-3 overflow-y-auto">
            <ControlsPanel
              config={config}
              onConfigChange={setConfig}
              isPlaying={isPlaying}
              onTogglePlay={() => setIsPlaying(!isPlaying)}
              onReset={handleReset}
            />
            <InfoPanel objects={objects} selectedId={selectedId} />
            <PresetsPanel onLoadPreset={handleLoadPreset} />

            {/* Object count */}
            <div
              className="px-4 py-2 rounded-lg text-xs"
              style={{
                background: "var(--panel)",
                border: "1px solid var(--line)",
                color: "var(--muted)",
              }}
            >
              {objects.filter((o) => o.type !== "spring").length} objects
              {" / "}
              {objects.filter((o) => o.type === "spring").length} springs
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
