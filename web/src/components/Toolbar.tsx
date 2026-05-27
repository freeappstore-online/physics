import type { ToolType } from "../physics/types";

interface ToolbarProps {
  activeTool: ToolType;
  onToolChange: (tool: ToolType) => void;
}

const TOOLS: { type: ToolType; label: string; icon: string }[] = [
  { type: "select", label: "Select", icon: "\u{1F446}" },
  { type: "ball", label: "Ball", icon: "\u{26AA}" },
  { type: "box", label: "Box", icon: "\u{1F7E7}" },
  { type: "platform", label: "Platform", icon: "\u{2796}" },
  { type: "spring", label: "Spring", icon: "\u{1F300}" },
  { type: "pendulum", label: "Pendulum", icon: "\u{1F3B5}" },
];

export function Toolbar({ activeTool, onToolChange }: ToolbarProps) {
  return (
    <div className="flex gap-1 p-2 rounded-lg" style={{ background: "var(--panel)" }}>
      {TOOLS.map((tool) => (
        <button
          key={tool.type}
          onClick={() => onToolChange(tool.type)}
          className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer"
          style={{
            background:
              activeTool === tool.type ? "var(--accent)" : "transparent",
            color: activeTool === tool.type ? "#fff" : "var(--ink)",
            border: "1px solid",
            borderColor:
              activeTool === tool.type ? "var(--accent)" : "var(--line)",
          }}
          title={tool.label}
        >
          <span className="text-base leading-none">{tool.icon}</span>
          <span>{tool.label}</span>
        </button>
      ))}
    </div>
  );
}
