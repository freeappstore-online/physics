import type { WorldConfig } from "../physics/types";

interface ControlsPanelProps {
  config: WorldConfig;
  onConfigChange: (config: WorldConfig) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onReset: () => void;
}

export function ControlsPanel({
  config,
  onConfigChange,
  isPlaying,
  onTogglePlay,
  onReset,
}: ControlsPanelProps) {
  const update = (patch: Partial<WorldConfig>) =>
    onConfigChange({ ...config, ...patch });

  return (
    <div
      className="flex flex-col gap-3 p-4 rounded-lg text-sm"
      style={{ background: "var(--panel)", border: "1px solid var(--line)" }}
    >
      <h3
        className="text-xs font-bold uppercase tracking-wider"
        style={{ color: "var(--muted)" }}
      >
        Controls
      </h3>

      {/* Play / Reset */}
      <div className="flex gap-2">
        <button
          onClick={onTogglePlay}
          className="flex-1 py-1.5 px-3 rounded-md font-semibold text-sm cursor-pointer transition-colors"
          style={{
            background: isPlaying ? "var(--warning)" : "var(--success)",
            color: "#fff",
            border: "none",
          }}
        >
          {isPlaying ? "Pause" : "Play"}
        </button>
        <button
          onClick={onReset}
          className="flex-1 py-1.5 px-3 rounded-md font-semibold text-sm cursor-pointer transition-colors"
          style={{
            background: "var(--error)",
            color: "#fff",
            border: "none",
          }}
        >
          Clear
        </button>
      </div>

      {/* Gravity */}
      <SliderControl
        label="Gravity"
        value={config.gravity}
        min={0}
        max={20}
        step={0.1}
        unit="m/s²"
        onChange={(v) => update({ gravity: v })}
      />

      {/* Restitution */}
      <SliderControl
        label="Bounciness"
        value={config.restitution}
        min={0}
        max={1}
        step={0.01}
        onChange={(v) => update({ restitution: v })}
      />

      {/* Friction */}
      <SliderControl
        label="Friction"
        value={config.friction}
        min={0}
        max={1}
        step={0.01}
        onChange={(v) => update({ friction: v })}
      />

      {/* Time scale */}
      <SliderControl
        label="Time Scale"
        value={config.timeScale}
        min={0.1}
        max={3}
        step={0.1}
        unit="x"
        onChange={(v) => update({ timeScale: v })}
      />

      {/* Toggles */}
      <div className="flex flex-col gap-2 mt-1">
        <ToggleControl
          label="Show Trails"
          value={config.showTrails}
          onChange={(v) => update({ showTrails: v })}
        />
        <ToggleControl
          label="Velocity Vectors"
          value={config.showVelocityVectors}
          onChange={(v) => update({ showVelocityVectors: v })}
        />
        <ToggleControl
          label="Show Grid"
          value={config.showGrid}
          onChange={(v) => update({ showGrid: v })}
        />
      </div>
    </div>
  );
}

function SliderControl({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between">
        <span style={{ color: "var(--ink)" }}>{label}</span>
        <span className="font-mono text-xs" style={{ color: "var(--muted)" }}>
          {value.toFixed(step < 1 ? 2 : 1)}
          {unit ? ` ${unit}` : ""}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-[var(--accent)]"
      />
    </div>
  );
}

function ToggleControl({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between cursor-pointer">
      <span style={{ color: "var(--ink)" }}>{label}</span>
      <div
        className="relative w-9 h-5 rounded-full transition-colors"
        style={{
          background: value ? "var(--accent)" : "var(--line-strong)",
        }}
        onClick={() => onChange(!value)}
      >
        <div
          className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform"
          style={{
            transform: value ? "translateX(18px)" : "translateX(2px)",
          }}
        />
      </div>
    </label>
  );
}
