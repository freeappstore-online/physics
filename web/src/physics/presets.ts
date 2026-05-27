import type { WorldObject, Ball, Platform, Pendulum, Spring } from "./types";
import { generateId } from "./types";

const BALL_COLORS = ["#2563eb", "#dc2626", "#16a34a", "#d97706", "#7c3aed", "#ec4899"];

function ballColor(i: number): string {
  return BALL_COLORS[i % BALL_COLORS.length]!;
}

function makeBall(x: number, y: number, r: number, color: string, vx = 0, vy = 0): Ball {
  return {
    id: generateId(),
    type: "ball",
    position: { x, y },
    velocity: { x: vx, y: vy },
    acceleration: { x: 0, y: 0 },
    mass: r * r * 0.01,
    restitution: 0.8,
    friction: 0.3,
    isStatic: false,
    color,
    angle: 0,
    angularVelocity: 0,
    radius: r,
    trail: [],
  };
}

function makePlatform(x: number, y: number, w: number, h: number): Platform {
  return {
    id: generateId(),
    type: "platform",
    position: { x, y },
    velocity: { x: 0, y: 0 },
    acceleration: { x: 0, y: 0 },
    mass: 999999,
    restitution: 0.5,
    friction: 0.5,
    isStatic: true,
    color: "#6b7280",
    angle: 0,
    angularVelocity: 0,
    width: w,
    height: h,
    trail: [],
  };
}

export interface PresetScene {
  name: string;
  description: string;
  create: (width: number, height: number) => WorldObject[];
}

export const PRESETS: PresetScene[] = [
  {
    name: "Newton's Cradle",
    description: "5 balls demonstrating conservation of momentum",
    create: (width: number, height: number): WorldObject[] => {
      const objects: WorldObject[] = [];
      const r = 20;
      const spacing = r * 2 + 2;
      const startX = width / 2 - spacing * 2;
      const baseY = height * 0.6;
      const pivotY = height * 0.15;

      // Add floor platform
      objects.push(makePlatform(0, height - 20, width, 20));

      for (let i = 0; i < 5; i++) {
        const x = startX + i * spacing;
        const pendulum: Pendulum = {
          id: generateId(),
          type: "pendulum",
          position: { x, y: baseY },
          velocity: { x: 0, y: 0 },
          acceleration: { x: 0, y: 0 },
          mass: 1,
          restitution: 0.98,
          friction: 0.01,
          isStatic: false,
          color: ballColor(i),
          angle: 0,
          angularVelocity: 0,
          pivotX: x,
          pivotY,
          length: baseY - pivotY,
          radius: r,
          theta: i === 0 ? -0.8 : 0,
          omega: 0,
          trail: [],
        };
        objects.push(pendulum);
      }

      return objects;
    },
  },
  {
    name: "Projectile",
    description: "Ball launched at 45 degrees",
    create: (width: number, height: number): WorldObject[] => {
      const objects: WorldObject[] = [];
      const floorY = height - 20;

      // Floor
      objects.push(makePlatform(0, floorY, width, 20));

      // Launch ramp (visual only)
      objects.push(makePlatform(20, floorY - 30, 120, 10));

      // Projectile ball
      const speed = 400;
      const angle = Math.PI / 4; // 45 degrees
      objects.push(
        makeBall(80, floorY - 55, 15, "#2563eb", speed * Math.cos(angle), -speed * Math.sin(angle)),
      );

      // Target platforms
      objects.push(makePlatform(width * 0.6, floorY - 80, 80, 10));
      objects.push(makePlatform(width * 0.75, floorY - 150, 60, 10));

      return objects;
    },
  },
  {
    name: "Double Pendulum",
    description: "Chaotic double pendulum motion",
    create: (width: number, height: number): WorldObject[] => {
      const objects: WorldObject[] = [];
      const pivotX = width / 2;
      const pivotY = height * 0.15;
      const len1 = 120;
      const len2 = 100;

      // Floor
      objects.push(makePlatform(0, height - 20, width, 20));

      // First pendulum
      const theta1 = Math.PI / 2 + 0.3;
      const p1: Pendulum = {
        id: generateId(),
        type: "pendulum",
        position: {
          x: pivotX + len1 * Math.sin(theta1),
          y: pivotY + len1 * Math.cos(theta1),
        },
        velocity: { x: 0, y: 0 },
        acceleration: { x: 0, y: 0 },
        mass: 2,
        restitution: 0.5,
        friction: 0.01,
        isStatic: false,
        color: "#2563eb",
        angle: 0,
        angularVelocity: 0,
        pivotX,
        pivotY,
        length: len1,
        radius: 16,
        theta: theta1,
        omega: 0,
        trail: [],
      };

      // Second pendulum attached to first
      const theta2 = Math.PI / 3;
      const p2PivotX = p1.position.x;
      const p2PivotY = p1.position.y;
      const p2: Pendulum = {
        id: generateId(),
        type: "pendulum",
        position: {
          x: p2PivotX + len2 * Math.sin(theta2),
          y: p2PivotY + len2 * Math.cos(theta2),
        },
        velocity: { x: 0, y: 0 },
        acceleration: { x: 0, y: 0 },
        mass: 1.5,
        restitution: 0.5,
        friction: 0.01,
        isStatic: false,
        color: "#dc2626",
        angle: 0,
        angularVelocity: 0,
        pivotX: p2PivotX,
        pivotY: p2PivotY,
        length: len2,
        radius: 12,
        theta: theta2,
        omega: 0,
        trail: [],
      };

      // Connect them with a spring to simulate the joint
      const spring: Spring = {
        id: generateId(),
        type: "spring",
        anchorA: p1.id,
        anchorB: p2.id,
        restLength: 0,
        stiffness: 500,
        damping: 2,
        color: "#6b7280",
      };

      objects.push(p1, p2, spring);

      return objects;
    },
  },
  {
    name: "Billiards",
    description: "Triangle of balls with a cue ball",
    create: (width: number, height: number): WorldObject[] => {
      const objects: WorldObject[] = [];
      const r = 14;
      const spacing = r * 2 + 3;

      // Walls (billiard table)
      const wallThickness = 20;
      objects.push(makePlatform(0, 0, width, wallThickness)); // top
      objects.push(makePlatform(0, height - wallThickness, width, wallThickness)); // bottom
      objects.push(makePlatform(0, 0, wallThickness, height)); // left
      objects.push(makePlatform(width - wallThickness, 0, wallThickness, height)); // right

      // Triangle arrangement
      const triStartX = width * 0.62;
      const triStartY = height / 2;
      let colorIdx = 1;

      for (let row = 0; row < 5; row++) {
        for (let col = 0; col <= row; col++) {
          const x = triStartX + row * spacing * 0.866;
          const y = triStartY + (col - row / 2) * spacing;
          objects.push(makeBall(x, y, r, ballColor(colorIdx++)));
        }
      }

      // Cue ball
      objects.push(makeBall(width * 0.22, height / 2, r, "#f5f5f5", 500, 0));

      return objects;
    },
  },
];
