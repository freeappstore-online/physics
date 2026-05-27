import type { WorldObject, PhysicsObject } from "../physics/types";

interface InfoPanelProps {
  objects: WorldObject[];
  selectedId: string | null;
}

export function InfoPanel({ objects, selectedId }: InfoPanelProps) {
  if (!selectedId) {
    return (
      <div
        className="p-4 rounded-lg text-sm"
        style={{ background: "var(--panel)", border: "1px solid var(--line)" }}
      >
        <h3
          className="text-xs font-bold uppercase tracking-wider mb-2"
          style={{ color: "var(--muted)" }}
        >
          Object Info
        </h3>
        <p style={{ color: "var(--muted)" }}>
          Click an object to see its properties
        </p>
      </div>
    );
  }

  const obj = objects.find((o) => o.id === selectedId);
  if (!obj || obj.type === "spring") {
    return (
      <div
        className="p-4 rounded-lg text-sm"
        style={{ background: "var(--panel)", border: "1px solid var(--line)" }}
      >
        <h3
          className="text-xs font-bold uppercase tracking-wider mb-2"
          style={{ color: "var(--muted)" }}
        >
          Object Info
        </h3>
        <p style={{ color: "var(--muted)" }}>
          {obj?.type === "spring" ? "Spring selected" : "Object not found"}
        </p>
      </div>
    );
  }

  const pObj = obj as PhysicsObject;
  const speed = Math.sqrt(
    pObj.velocity.x * pObj.velocity.x + pObj.velocity.y * pObj.velocity.y,
  );
  const ke = 0.5 * pObj.mass * speed * speed;

  return (
    <div
      className="p-4 rounded-lg text-sm"
      style={{ background: "var(--panel)", border: "1px solid var(--line)" }}
    >
      <h3
        className="text-xs font-bold uppercase tracking-wider mb-3"
        style={{ color: "var(--muted)" }}
      >
        Object Info
      </h3>

      <div className="flex flex-col gap-2">
        <InfoRow label="Type" value={pObj.type} />
        <InfoRow
          label="Position"
          value={`(${pObj.position.x.toFixed(1)}, ${pObj.position.y.toFixed(1)})`}
        />
        <InfoRow
          label="Velocity"
          value={`(${pObj.velocity.x.toFixed(1)}, ${pObj.velocity.y.toFixed(1)})`}
        />
        <InfoRow label="Speed" value={`${speed.toFixed(1)} px/s`} />
        <InfoRow label="Mass" value={`${pObj.mass.toFixed(2)} kg`} />
        <InfoRow label="Kinetic Energy" value={`${ke.toFixed(1)} J`} />
        {pObj.type === "ball" && (
          <InfoRow label="Radius" value={`${pObj.radius.toFixed(0)} px`} />
        )}
        {pObj.type === "pendulum" && (
          <>
            <InfoRow label="Length" value={`${pObj.length.toFixed(0)} px`} />
            <InfoRow
              label="Angle"
              value={`${((pObj.theta * 180) / Math.PI).toFixed(1)}°`}
            />
          </>
        )}
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span style={{ color: "var(--muted)" }}>{label}</span>
      <span className="font-mono text-xs" style={{ color: "var(--ink)" }}>
        {value}
      </span>
    </div>
  );
}
