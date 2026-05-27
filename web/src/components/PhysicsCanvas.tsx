import { useRef, useEffect, useCallback } from "react";
import type {
  WorldObject,
  PhysicsObject,
  Box,
  Platform,
  Pendulum,
  Spring,
  ToolType,
  WorldConfig,
  ObjectId,
} from "../physics/types";
import { generateId } from "../physics/types";
import { render } from "../physics/renderer";
import { step } from "../physics/engine";
import * as v from "../physics/vec2";
import { useCanvasSize } from "../hooks/useCanvasSize";

const BALL_COLORS = [
  "#2563eb",
  "#dc2626",
  "#16a34a",
  "#d97706",
  "#7c3aed",
  "#ec4899",
  "#06b6d4",
  "#f97316",
];

interface PhysicsCanvasProps {
  objects: WorldObject[];
  onObjectsChange: (objects: WorldObject[]) => void;
  config: WorldConfig;
  activeTool: ToolType;
  selectedId: ObjectId | null;
  onSelect: (id: ObjectId | null) => void;
  isPlaying: boolean;
  isDark: boolean;
}

export function PhysicsCanvas({
  objects,
  onObjectsChange,
  config,
  activeTool,
  selectedId,
  onSelect,
  isPlaying,
  isDark,
}: PhysicsCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { width, height } = useCanvasSize(containerRef);
  const objectsRef = useRef(objects);
  objectsRef.current = objects;
  const configRef = useRef(config);
  configRef.current = config;
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;

  // Drag state
  const dragState = useRef<{
    isDragging: boolean;
    objectId: ObjectId | null;
    offsetX: number;
    offsetY: number;
    startX: number;
    startY: number;
    startTime: number;
    /** For spring creation: first anchor */
    springFirstAnchor: ObjectId | null;
  }>({
    isDragging: false,
    objectId: null,
    offsetX: 0,
    offsetY: 0,
    startX: 0,
    startY: 0,
    startTime: 0,
    springFirstAnchor: null,
  });

  // Animation loop
  useEffect(() => {
    let lastTime = performance.now();
    let animId: number;

    const loop = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.05); // cap at 50ms
      lastTime = now;

      if (isPlayingRef.current) {
        const newObjects = step(
          objectsRef.current,
          configRef.current,
          width,
          height,
          dt,
        );
        objectsRef.current = newObjects;
        onObjectsChange(newObjects);
      }

      // Render
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          render(
            ctx,
            objectsRef.current,
            configRef.current,
            selectedId,
            width,
            height,
            isDark,
          );
        }
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [width, height, onObjectsChange, selectedId, isDark]);

  // Hit test: find which object is at (x, y)
  const hitTest = useCallback(
    (x: number, y: number): PhysicsObject | null => {
      // Reverse order so top-most objects are picked first
      const physicsObjs = objectsRef.current.filter(
        (o) => o.type !== "spring",
      ) as PhysicsObject[];
      for (let i = physicsObjs.length - 1; i >= 0; i--) {
        const obj = physicsObjs[i]!;
        if (obj.type === "ball" || obj.type === "pendulum") {
          const r =
            obj.type === "ball" ? obj.radius : (obj as Pendulum).radius;
          if (v.distance(obj.position, { x, y }) <= r + 4) return obj;
        } else {
          const rect = obj as Box | Platform;
          if (
            x >= rect.position.x - 4 &&
            x <= rect.position.x + rect.width + 4 &&
            y >= rect.position.y - 4 &&
            y <= rect.position.y + rect.height + 4
          ) {
            return obj;
          }
        }
      }
      return null;
    },
    [],
  );

  const getCanvasPos = useCallback(
    (e: React.MouseEvent | React.TouchEvent): { x: number; y: number } => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      const clientX =
        "touches" in e
          ? (e.touches[0]?.clientX ?? 0)
          : (e as React.MouseEvent).clientX;
      const clientY =
        "touches" in e
          ? (e.touches[0]?.clientY ?? 0)
          : (e as React.MouseEvent).clientY;
      return {
        x: clientX - rect.left,
        y: clientY - rect.top,
      };
    },
    [],
  );

  const handlePointerDown = useCallback(
    (e: React.MouseEvent) => {
      const pos = getCanvasPos(e);
      const ds = dragState.current;

      if (activeTool === "select") {
        const hit = hitTest(pos.x, pos.y);
        if (hit) {
          onSelect(hit.id);
          ds.isDragging = true;
          ds.objectId = hit.id;
          if (hit.type === "ball" || hit.type === "pendulum") {
            ds.offsetX = pos.x - hit.position.x;
            ds.offsetY = pos.y - hit.position.y;
          } else {
            ds.offsetX = pos.x - hit.position.x;
            ds.offsetY = pos.y - hit.position.y;
          }
          ds.startX = pos.x;
          ds.startY = pos.y;
          ds.startTime = performance.now();
        } else {
          onSelect(null);
        }
        return;
      }

      if (activeTool === "spring") {
        const hit = hitTest(pos.x, pos.y);
        if (!hit) return;

        if (!ds.springFirstAnchor) {
          ds.springFirstAnchor = hit.id;
          onSelect(hit.id);
        } else {
          if (ds.springFirstAnchor !== hit.id) {
            const spring: Spring = {
              id: generateId(),
              type: "spring",
              anchorA: ds.springFirstAnchor,
              anchorB: hit.id,
              restLength: 100,
              stiffness: 200,
              damping: 5,
              color: "#6b7280",
            };
            onObjectsChange([...objectsRef.current, spring]);
          }
          ds.springFirstAnchor = null;
          onSelect(null);
        }
        return;
      }

      // Place new object
      const newObj = createObject(activeTool, pos.x, pos.y, config);
      if (newObj) {
        onObjectsChange([...objectsRef.current, newObj]);
        onSelect(newObj.id);
      }
    },
    [activeTool, config, hitTest, getCanvasPos, onSelect, onObjectsChange],
  );

  const handlePointerMove = useCallback(
    (e: React.MouseEvent) => {
      const ds = dragState.current;
      if (!ds.isDragging || !ds.objectId) return;

      const pos = getCanvasPos(e);
      const objs = objectsRef.current.map((obj) => {
        if (obj.id !== ds.objectId || obj.type === "spring") return obj;
        const pObj = obj as PhysicsObject;
        return {
          ...pObj,
          position: {
            x: pos.x - ds.offsetX,
            y: pos.y - ds.offsetY,
          },
          velocity: { x: 0, y: 0 },
        };
      });
      onObjectsChange(objs);
    },
    [getCanvasPos, onObjectsChange],
  );

  const handlePointerUp = useCallback(
    (e: React.MouseEvent) => {
      const ds = dragState.current;
      if (!ds.isDragging || !ds.objectId) {
        ds.isDragging = false;
        return;
      }

      const pos = getCanvasPos(e);
      const elapsed = performance.now() - ds.startTime;
      const dx = pos.x - ds.startX;
      const dy = pos.y - ds.startY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Fling: if dragged quickly, give velocity
      if (dist > 20 && elapsed < 500) {
        const flingScale = 3;
        const vx = (dx / elapsed) * 1000 * flingScale;
        const vy = (dy / elapsed) * 1000 * flingScale;
        const objs = objectsRef.current.map((obj) => {
          if (obj.id !== ds.objectId || obj.type === "spring") return obj;
          const pObj = obj as PhysicsObject;
          if (pObj.isStatic) return pObj;
          return { ...pObj, velocity: { x: vx, y: vy } };
        });
        onObjectsChange(objs);
      }

      ds.isDragging = false;
      ds.objectId = null;
    },
    [getCanvasPos, onObjectsChange],
  );

  return (
    <div
      ref={containerRef}
      className="flex-1 rounded-lg overflow-hidden relative"
      style={{
        border: "1px solid var(--line)",
        minHeight: 400,
        cursor:
          activeTool === "select"
            ? "default"
            : activeTool === "spring"
              ? "crosshair"
              : "cell",
      }}
    >
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        onMouseDown={handlePointerDown}
        onMouseMove={handlePointerMove}
        onMouseUp={handlePointerUp}
        onMouseLeave={handlePointerUp}
        style={{ display: "block", width: "100%", height: "100%" }}
      />
      {/* Spring creation hint */}
      {activeTool === "spring" && dragState.current.springFirstAnchor && (
        <div
          className="absolute top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-md text-xs font-medium"
          style={{
            background: "var(--glass)",
            border: "1px solid var(--line)",
            color: "var(--ink)",
            backdropFilter: "blur(8px)",
          }}
        >
          Click a second object to connect the spring
        </div>
      )}
    </div>
  );
}

let colorCounter = 0;

function createObject(
  tool: ToolType,
  x: number,
  y: number,
  config: WorldConfig,
): PhysicsObject | null {
  const color = BALL_COLORS[colorCounter++ % BALL_COLORS.length]!;

  switch (tool) {
    case "ball":
      return {
        id: generateId(),
        type: "ball",
        position: { x, y },
        velocity: { x: 0, y: 0 },
        acceleration: { x: 0, y: 0 },
        mass: 1,
        restitution: config.restitution,
        friction: config.friction,
        isStatic: false,
        color,
        angle: 0,
        angularVelocity: 0,
        radius: 20,
        trail: [],
      };
    case "box":
      return {
        id: generateId(),
        type: "box",
        position: { x: x - 25, y: y - 25 },
        velocity: { x: 0, y: 0 },
        acceleration: { x: 0, y: 0 },
        mass: 2,
        restitution: config.restitution,
        friction: config.friction,
        isStatic: false,
        color,
        angle: 0,
        angularVelocity: 0,
        width: 50,
        height: 50,
        trail: [],
      };
    case "platform":
      return {
        id: generateId(),
        type: "platform",
        position: { x: x - 75, y: y - 8 },
        velocity: { x: 0, y: 0 },
        acceleration: { x: 0, y: 0 },
        mass: 999999,
        restitution: config.restitution,
        friction: config.friction,
        isStatic: true,
        color: "#6b7280",
        angle: 0,
        angularVelocity: 0,
        width: 150,
        height: 16,
        trail: [],
      };
    case "pendulum":
      return {
        id: generateId(),
        type: "pendulum",
        position: { x, y },
        velocity: { x: 0, y: 0 },
        acceleration: { x: 0, y: 0 },
        mass: 1.5,
        restitution: config.restitution,
        friction: config.friction,
        isStatic: false,
        color,
        angle: 0,
        angularVelocity: 0,
        pivotX: x,
        pivotY: Math.max(20, y - 150),
        length: 150,
        radius: 16,
        theta: 0.5,
        omega: 0,
        trail: [],
      } satisfies Pendulum;
    default:
      return null;
  }
}
