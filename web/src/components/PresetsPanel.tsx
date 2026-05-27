import { PRESETS } from "../physics/presets";

interface PresetsPanelProps {
  onLoadPreset: (index: number) => void;
}

export function PresetsPanel({ onLoadPreset }: PresetsPanelProps) {
  return (
    <div
      className="p-4 rounded-lg text-sm"
      style={{ background: "var(--panel)", border: "1px solid var(--line)" }}
    >
      <h3
        className="text-xs font-bold uppercase tracking-wider mb-3"
        style={{ color: "var(--muted)" }}
      >
        Preset Scenes
      </h3>
      <div className="flex flex-col gap-2">
        {PRESETS.map((preset, i) => (
          <button
            key={preset.name}
            onClick={() => onLoadPreset(i)}
            className="text-left p-2 rounded-md transition-colors cursor-pointer"
            style={{
              border: "1px solid var(--line)",
              background: "transparent",
              color: "var(--ink)",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "var(--line)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "transparent")
            }
          >
            <div className="font-semibold text-sm">{preset.name}</div>
            <div className="text-xs" style={{ color: "var(--muted)" }}>
              {preset.description}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
