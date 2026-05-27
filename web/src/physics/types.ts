/** Unique identifier for physics objects */
export type ObjectId = string;

/** 2D vector */
export interface Vec2 {
  x: number;
  y: number;
}

/** Base properties shared by all physics objects */
interface PhysicsObjectBase {
  id: ObjectId;
  position: Vec2;
  velocity: Vec2;
  acceleration: Vec2;
  mass: number;
  restitution: number;
  friction: number;
  isStatic: boolean;
  color: string;
  angle: number;
  angularVelocity: number;
  trail: Vec2[];
}

export interface Ball extends PhysicsObjectBase {
  type: "ball";
  radius: number;
}

export interface Box extends PhysicsObjectBase {
  type: "box";
  width: number;
  height: number;
}

export interface Platform extends PhysicsObjectBase {
  type: "platform";
  width: number;
  height: number;
}

export interface Spring {
  id: ObjectId;
  type: "spring";
  anchorA: ObjectId;
  anchorB: ObjectId;
  restLength: number;
  stiffness: number;
  damping: number;
  color: string;
}

export interface Pendulum extends PhysicsObjectBase {
  type: "pendulum";
  pivotX: number;
  pivotY: number;
  length: number;
  radius: number;
  /** Current angle from vertical (radians) */
  theta: number;
  /** Angular velocity (rad/s) */
  omega: number;
}

export type PhysicsObject = Ball | Box | Platform | Pendulum;
export type WorldObject = PhysicsObject | Spring;

export type ToolType = "ball" | "box" | "platform" | "spring" | "pendulum" | "select";

export interface WorldConfig {
  gravity: number;
  restitution: number;
  friction: number;
  timeScale: number;
  showTrails: boolean;
  showVelocityVectors: boolean;
  showGrid: boolean;
}

export interface PresetScene {
  name: string;
  description: string;
  create: (width: number, height: number) => WorldObject[];
}

export const DEFAULT_CONFIG: WorldConfig = {
  gravity: 9.81,
  restitution: 0.6,
  friction: 0.3,
  timeScale: 1,
  showTrails: false,
  showVelocityVectors: false,
  showGrid: true,
};

let _nextId = 0;
export function generateId(): ObjectId {
  return `obj_${++_nextId}_${Date.now()}`;
}
