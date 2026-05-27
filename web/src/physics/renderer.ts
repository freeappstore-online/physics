import type {
  WorldObject,
  PhysicsObject,
  Ball,
  Box,
  Platform,
  Pendulum,
  Spring,
  WorldConfig,
  ObjectId,
} from "./types";
import * as v from "./vec2";

/**
 * Render the entire scene onto a 2D canvas context.
 */
export function render(
  ctx: CanvasRenderingContext2D,
  objects: WorldObject[],
  config: WorldConfig,
  selectedId: ObjectId | null,
  canvasWidth: number,
  canvasHeight: number,
  isDark: boolean,
): void {
  // Clear
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  // Background
  ctx.fillStyle = isDark ? "#0f0f0f" : "#ffffff";
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // Grid
  if (config.showGrid) {
    drawGrid(ctx, canvasWidth, canvasHeight, isDark);
  }

  // Build object map for spring lookups
  const objMap = new Map<string, PhysicsObject>();
  for (const obj of objects) {
    if (obj.type !== "spring") {
      objMap.set(obj.id, obj);
    }
  }

  // Render springs first (behind objects)
  for (const obj of objects) {
    if (obj.type === "spring") {
      drawSpring(ctx, obj, objMap);
    }
  }

  // Render trails
  if (config.showTrails) {
    for (const obj of objects) {
      if (obj.type !== "spring" && obj.trail.length > 1) {
        drawTrail(ctx, obj, isDark);
      }
    }
  }

  // Render physics objects
  for (const obj of objects) {
    if (obj.type === "spring") continue;

    switch (obj.type) {
      case "ball":
        drawBall(ctx, obj, obj.id === selectedId);
        break;
      case "box":
        drawBox(ctx, obj, obj.id === selectedId);
        break;
      case "platform":
        drawPlatform(ctx, obj, obj.id === selectedId, isDark);
        break;
      case "pendulum":
        drawPendulum(ctx, obj, obj.id === selectedId, isDark);
        break;
    }

    // Velocity vectors
    if (config.showVelocityVectors && !obj.isStatic) {
      drawVelocityVector(ctx, obj);
    }
  }

  // Selection highlight
  if (selectedId) {
    const sel = objMap.get(selectedId);
    if (sel) {
      drawSelectionRing(ctx, sel);
    }
  }
}

function drawGrid(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  isDark: boolean,
): void {
  const gridSize = 40;
  ctx.strokeStyle = isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.06)";
  ctx.lineWidth = 1;

  ctx.beginPath();
  for (let x = 0; x <= w; x += gridSize) {
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, h);
  }
  for (let y = 0; y <= h; y += gridSize) {
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(w, y + 0.5);
  }
  ctx.stroke();
}

function drawBall(ctx: CanvasRenderingContext2D, ball: Ball, selected: boolean): void {
  ctx.save();
  ctx.beginPath();
  ctx.arc(ball.position.x, ball.position.y, ball.radius, 0, Math.PI * 2);

  // Gradient fill
  const grad = ctx.createRadialGradient(
    ball.position.x - ball.radius * 0.3,
    ball.position.y - ball.radius * 0.3,
    ball.radius * 0.1,
    ball.position.x,
    ball.position.y,
    ball.radius,
  );
  grad.addColorStop(0, lighten(ball.color, 30));
  grad.addColorStop(1, ball.color);
  ctx.fillStyle = grad;
  ctx.fill();

  if (selected) {
    ctx.strokeStyle = "#fbbf24";
    ctx.lineWidth = 3;
  } else {
    ctx.strokeStyle = darken(ball.color, 20);
    ctx.lineWidth = 1.5;
  }
  ctx.stroke();
  ctx.restore();
}

function drawBox(ctx: CanvasRenderingContext2D, box: Box, selected: boolean): void {
  ctx.save();
  ctx.fillStyle = box.color;
  ctx.fillRect(box.position.x, box.position.y, box.width, box.height);

  if (selected) {
    ctx.strokeStyle = "#fbbf24";
    ctx.lineWidth = 3;
  } else {
    ctx.strokeStyle = darken(box.color, 20);
    ctx.lineWidth = 1.5;
  }
  ctx.strokeRect(box.position.x, box.position.y, box.width, box.height);
  ctx.restore();
}

function drawPlatform(
  ctx: CanvasRenderingContext2D,
  platform: Platform,
  selected: boolean,
  isDark: boolean,
): void {
  ctx.save();

  // Hatched fill for platforms
  ctx.fillStyle = isDark ? "#2d2d2d" : "#e5e7eb";
  ctx.fillRect(platform.position.x, platform.position.y, platform.width, platform.height);

  // Diagonal hatching
  ctx.strokeStyle = isDark ? "#404040" : "#d1d5db";
  ctx.lineWidth = 1;
  ctx.beginPath();
  const step = 8;
  for (
    let i = -platform.height;
    i < platform.width + platform.height;
    i += step
  ) {
    const x1 = platform.position.x + i;
    const y1 = platform.position.y;
    const x2 = platform.position.x + i - platform.height;
    const y2 = platform.position.y + platform.height;
    ctx.moveTo(
      Math.max(platform.position.x, Math.min(x1, platform.position.x + platform.width)),
      Math.max(platform.position.y, Math.min(y1, platform.position.y + platform.height)),
    );
    ctx.lineTo(
      Math.max(platform.position.x, Math.min(x2, platform.position.x + platform.width)),
      Math.max(platform.position.y, Math.min(y2, platform.position.y + platform.height)),
    );
  }
  ctx.stroke();

  // Border
  if (selected) {
    ctx.strokeStyle = "#fbbf24";
    ctx.lineWidth = 3;
  } else {
    ctx.strokeStyle = isDark ? "#555" : "#9ca3af";
    ctx.lineWidth = 2;
  }
  ctx.strokeRect(platform.position.x, platform.position.y, platform.width, platform.height);
  ctx.restore();
}

function drawPendulum(
  ctx: CanvasRenderingContext2D,
  p: Pendulum,
  selected: boolean,
  isDark: boolean,
): void {
  ctx.save();

  // Draw rod
  ctx.beginPath();
  ctx.moveTo(p.pivotX, p.pivotY);
  ctx.lineTo(p.position.x, p.position.y);
  ctx.strokeStyle = isDark ? "#6b7280" : "#9ca3af";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Draw pivot
  ctx.beginPath();
  ctx.arc(p.pivotX, p.pivotY, 5, 0, Math.PI * 2);
  ctx.fillStyle = isDark ? "#6b7280" : "#9ca3af";
  ctx.fill();

  // Draw bob
  ctx.beginPath();
  ctx.arc(p.position.x, p.position.y, p.radius, 0, Math.PI * 2);
  const grad = ctx.createRadialGradient(
    p.position.x - p.radius * 0.3,
    p.position.y - p.radius * 0.3,
    p.radius * 0.1,
    p.position.x,
    p.position.y,
    p.radius,
  );
  grad.addColorStop(0, lighten(p.color, 30));
  grad.addColorStop(1, p.color);
  ctx.fillStyle = grad;
  ctx.fill();

  if (selected) {
    ctx.strokeStyle = "#fbbf24";
    ctx.lineWidth = 3;
  } else {
    ctx.strokeStyle = darken(p.color, 20);
    ctx.lineWidth = 1.5;
  }
  ctx.stroke();
  ctx.restore();
}

function drawSpring(
  ctx: CanvasRenderingContext2D,
  spring: Spring,
  objMap: Map<string, PhysicsObject>,
): void {
  const a = objMap.get(spring.anchorA);
  const b = objMap.get(spring.anchorB);
  if (!a || !b) return;

  const posA = getObjCenter(a);
  const posB = getObjCenter(b);

  ctx.save();
  ctx.strokeStyle = spring.color;
  ctx.lineWidth = 2;

  // Draw zigzag spring
  const diff = v.sub(posB, posA);
  const dist = v.length(diff);
  if (dist < 1e-6) {
    ctx.restore();
    return;
  }
  const dir = v.normalize(diff);
  const perp = { x: -dir.y, y: dir.x };

  const coils = 12;
  const amplitude = 8;

  ctx.beginPath();
  ctx.moveTo(posA.x, posA.y);

  for (let i = 1; i <= coils; i++) {
    const t = i / coils;
    const mid = v.add(posA, v.scale(diff, t));
    const sign = i % 2 === 0 ? 1 : -1;
    const offset = v.scale(perp, sign * amplitude);
    if (i === coils) {
      ctx.lineTo(posB.x, posB.y);
    } else {
      ctx.lineTo(mid.x + offset.x, mid.y + offset.y);
    }
  }
  ctx.stroke();
  ctx.restore();
}

function drawTrail(
  ctx: CanvasRenderingContext2D,
  obj: PhysicsObject,
  isDark: boolean,
): void {
  if (obj.trail.length < 2) return;
  ctx.save();
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  for (let i = 1; i < obj.trail.length; i++) {
    const alpha = i / obj.trail.length;
    const prev = obj.trail[i - 1]!;
    const curr = obj.trail[i]!;
    ctx.beginPath();
    ctx.strokeStyle = isDark
      ? `rgba(100, 160, 255, ${alpha * 0.5})`
      : `rgba(37, 99, 235, ${alpha * 0.4})`;
    ctx.moveTo(prev.x, prev.y);
    ctx.lineTo(curr.x, curr.y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawVelocityVector(
  ctx: CanvasRenderingContext2D,
  obj: PhysicsObject,
): void {
  const center = getObjCenter(obj);
  const speed = v.length(obj.velocity);
  if (speed < 5) return;

  const scale = 0.15;
  const endX = center.x + obj.velocity.x * scale;
  const endY = center.y + obj.velocity.y * scale;

  ctx.save();
  ctx.strokeStyle = "#ef4444";
  ctx.fillStyle = "#ef4444";
  ctx.lineWidth = 2;

  // Line
  ctx.beginPath();
  ctx.moveTo(center.x, center.y);
  ctx.lineTo(endX, endY);
  ctx.stroke();

  // Arrowhead
  const angle = Math.atan2(endY - center.y, endX - center.x);
  const headLen = 8;
  ctx.beginPath();
  ctx.moveTo(endX, endY);
  ctx.lineTo(
    endX - headLen * Math.cos(angle - Math.PI / 6),
    endY - headLen * Math.sin(angle - Math.PI / 6),
  );
  ctx.lineTo(
    endX - headLen * Math.cos(angle + Math.PI / 6),
    endY - headLen * Math.sin(angle + Math.PI / 6),
  );
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawSelectionRing(ctx: CanvasRenderingContext2D, obj: PhysicsObject): void {
  const center = getObjCenter(obj);
  let radius: number;

  if (obj.type === "ball" || obj.type === "pendulum") {
    radius = (obj as Ball).radius + 6;
  } else {
    const rect = obj as Box | Platform;
    radius = Math.max(rect.width, rect.height) / 2 + 6;
  }

  ctx.save();
  ctx.strokeStyle = "rgba(251, 191, 36, 0.5)";
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

function getObjCenter(obj: PhysicsObject): { x: number; y: number } {
  if (obj.type === "ball" || obj.type === "pendulum") {
    return { x: obj.position.x, y: obj.position.y };
  }
  const rect = obj as Box | Platform;
  return {
    x: rect.position.x + rect.width / 2,
    y: rect.position.y + rect.height / 2,
  };
}

// Color utility helpers
function lighten(hex: string, amount: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  return `rgb(${Math.min(255, rgb.r + amount)}, ${Math.min(255, rgb.g + amount)}, ${Math.min(255, rgb.b + amount)})`;
}

function darken(hex: string, amount: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  return `rgb(${Math.max(0, rgb.r - amount)}, ${Math.max(0, rgb.g - amount)}, ${Math.max(0, rgb.b - amount)})`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const match = /^#([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!match) return null;
  return {
    r: parseInt(match[1]!, 16),
    g: parseInt(match[2]!, 16),
    b: parseInt(match[3]!, 16),
  };
}
