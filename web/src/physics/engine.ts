import type {
  PhysicsObject,
  WorldObject,
  WorldConfig,
  Ball,
  Box,
  Platform,
  Pendulum,
  Spring,
  Vec2,
} from "./types";
import * as v from "./vec2";

const MAX_TRAIL_LENGTH = 120;
const PIXELS_PER_METER = 50;

/**
 * Step the physics world forward by dt seconds.
 * Returns new arrays (immutable from the caller's perspective).
 */
export function step(
  objects: WorldObject[],
  config: WorldConfig,
  canvasWidth: number,
  canvasHeight: number,
  dt: number,
): WorldObject[] {
  const effectiveDt = dt * config.timeScale;
  if (effectiveDt <= 0) return objects;

  // Separate physics objects from springs
  const physicsObjects: PhysicsObject[] = [];
  const springs: Spring[] = [];
  for (const obj of objects) {
    if (obj.type === "spring") {
      springs.push(obj);
    } else {
      physicsObjects.push(obj);
    }
  }

  // Build a map for quick lookup
  const objMap = new Map<string, PhysicsObject>();
  for (const o of physicsObjects) {
    objMap.set(o.id, o);
  }

  // Clone all physics objects for mutation
  const updated: PhysicsObject[] = physicsObjects.map((o) => ({
    ...o,
    position: { ...o.position },
    velocity: { ...o.velocity },
    acceleration: { ...o.acceleration },
    trail: [...o.trail],
  }));

  const updatedMap = new Map<string, PhysicsObject>();
  for (const o of updated) {
    updatedMap.set(o.id, o);
  }

  // Apply gravity
  const gravityPixels = config.gravity * PIXELS_PER_METER;
  for (const obj of updated) {
    if (obj.isStatic) continue;
    if (obj.type === "pendulum") continue; // handled separately
    obj.acceleration = { x: 0, y: gravityPixels };
  }

  // Apply spring forces
  for (const spring of springs) {
    const a = updatedMap.get(spring.anchorA);
    const b = updatedMap.get(spring.anchorB);
    if (!a || !b) continue;

    const posA = getCenter(a);
    const posB = getCenter(b);
    const diff = v.sub(posB, posA);
    const dist = v.length(diff);
    if (dist < 1e-6) continue;

    const dir = v.normalize(diff);
    const stretch = dist - spring.restLength;
    const forceMag = spring.stiffness * stretch;

    // Damping
    const relVel = v.sub(b.velocity, a.velocity);
    const dampForce = spring.damping * v.dot(relVel, dir);

    const totalForce = forceMag + dampForce;

    if (!a.isStatic) {
      a.acceleration = v.add(a.acceleration, v.scale(dir, totalForce / a.mass));
    }
    if (!b.isStatic) {
      b.acceleration = v.add(
        b.acceleration,
        v.scale(dir, -totalForce / b.mass),
      );
    }
  }

  // Integrate (Euler)
  for (const obj of updated) {
    if (obj.isStatic) continue;

    if (obj.type === "pendulum") {
      integratePendulum(obj, gravityPixels, effectiveDt);
      continue;
    }

    // Apply friction as velocity damping
    const frictionFactor = 1 - config.friction * 0.05;
    obj.velocity.x *= frictionFactor;
    obj.velocity.y *= frictionFactor;

    obj.velocity.x += obj.acceleration.x * effectiveDt;
    obj.velocity.y += obj.acceleration.y * effectiveDt;

    obj.position.x += obj.velocity.x * effectiveDt;
    obj.position.y += obj.velocity.y * effectiveDt;

    // Record trail
    if (config.showTrails) {
      obj.trail.push({ x: obj.position.x, y: obj.position.y });
      if (obj.trail.length > MAX_TRAIL_LENGTH) {
        obj.trail.shift();
      }
    }
  }

  // Collision: objects vs canvas boundaries
  for (const obj of updated) {
    if (obj.isStatic) continue;
    resolveWallCollision(obj, canvasWidth, canvasHeight, config.restitution, config.friction);
  }

  // Collision: object vs object
  for (let i = 0; i < updated.length; i++) {
    for (let j = i + 1; j < updated.length; j++) {
      const a = updated[i]!;
      const b = updated[j]!;
      resolveCollision(a, b, config.restitution, config.friction);
    }
  }

  return [...updated, ...springs];
}

function integratePendulum(p: Pendulum, gravityPx: number, dt: number): void {
  // Simple pendulum: theta'' = -(g/L)*sin(theta) - damping*omega
  const angularAccel = -(gravityPx / p.length) * Math.sin(p.theta) - 0.01 * p.omega;
  p.omega += angularAccel * dt;
  p.theta += p.omega * dt;

  // Update position from pivot + angle
  p.position.x = p.pivotX + p.length * Math.sin(p.theta);
  p.position.y = p.pivotY + p.length * Math.cos(p.theta);

  p.velocity.x = p.length * p.omega * Math.cos(p.theta);
  p.velocity.y = -p.length * p.omega * Math.sin(p.theta);
}

function getCenter(obj: PhysicsObject): Vec2 {
  if (obj.type === "ball" || obj.type === "pendulum") {
    return { ...obj.position };
  }
  return {
    x: obj.position.x + (obj as Box | Platform).width / 2,
    y: obj.position.y + (obj as Box | Platform).height / 2,
  };
}

function resolveWallCollision(
  obj: PhysicsObject,
  w: number,
  h: number,
  restitution: number,
  friction: number,
): void {
  if (obj.type === "pendulum") return;

  if (obj.type === "ball") {
    const r = obj.radius;
    // Floor
    if (obj.position.y + r > h) {
      obj.position.y = h - r;
      obj.velocity.y = -Math.abs(obj.velocity.y) * restitution;
      obj.velocity.x *= 1 - friction * 0.3;
    }
    // Ceiling
    if (obj.position.y - r < 0) {
      obj.position.y = r;
      obj.velocity.y = Math.abs(obj.velocity.y) * restitution;
    }
    // Right wall
    if (obj.position.x + r > w) {
      obj.position.x = w - r;
      obj.velocity.x = -Math.abs(obj.velocity.x) * restitution;
      obj.velocity.y *= 1 - friction * 0.3;
    }
    // Left wall
    if (obj.position.x - r < 0) {
      obj.position.x = r;
      obj.velocity.x = Math.abs(obj.velocity.x) * restitution;
      obj.velocity.y *= 1 - friction * 0.3;
    }
    return;
  }

  // Box
  const box = obj as Box;
  // Floor
  if (box.position.y + box.height > h) {
    box.position.y = h - box.height;
    box.velocity.y = -Math.abs(box.velocity.y) * restitution;
    box.velocity.x *= 1 - friction * 0.3;
  }
  // Ceiling
  if (box.position.y < 0) {
    box.position.y = 0;
    box.velocity.y = Math.abs(box.velocity.y) * restitution;
  }
  // Right wall
  if (box.position.x + box.width > w) {
    box.position.x = w - box.width;
    box.velocity.x = -Math.abs(box.velocity.x) * restitution;
  }
  // Left wall
  if (box.position.x < 0) {
    box.position.x = 0;
    box.velocity.x = Math.abs(box.velocity.x) * restitution;
  }
}

function resolveCollision(
  a: PhysicsObject,
  b: PhysicsObject,
  restitution: number,
  friction: number,
): void {
  // Skip if both static
  if (a.isStatic && b.isStatic) return;

  if (a.type === "ball" && b.type === "ball") {
    resolveBallBall(a, b, restitution);
  } else if (a.type === "ball" && (b.type === "box" || b.type === "platform")) {
    resolveBallRect(a, b, restitution, friction);
  } else if ((a.type === "box" || a.type === "platform") && b.type === "ball") {
    resolveBallRect(b, a, restitution, friction);
  } else if (
    (a.type === "box" || a.type === "platform") &&
    (b.type === "box" || b.type === "platform")
  ) {
    resolveRectRect(a as Box | Platform, b as Box | Platform, restitution, friction);
  } else if (a.type === "ball" && b.type === "pendulum") {
    resolveBallBall(a, { ...b, type: "ball" as const, radius: b.radius } as Ball, restitution);
  } else if (a.type === "pendulum" && b.type === "ball") {
    resolveBallBall({ ...a, type: "ball" as const, radius: a.radius } as Ball, b, restitution);
  }
}

function resolveBallBall(a: Ball | PhysicsObject, b: Ball | PhysicsObject, restitution: number): void {
  const ballA = a as Ball;
  const ballB = b as Ball;
  const diff = v.sub(ballB.position, ballA.position);
  const dist = v.length(diff);
  const minDist = ballA.radius + ballB.radius;

  if (dist >= minDist || dist < 1e-6) return;

  const normal = v.normalize(diff);
  const overlap = minDist - dist;

  // Separate
  const totalMass = (a.isStatic ? 0 : a.mass) + (b.isStatic ? 0 : b.mass);
  if (totalMass < 1e-6) return;

  if (!a.isStatic) {
    const ratio = b.isStatic ? 1 : b.mass / totalMass;
    a.position.x -= normal.x * overlap * ratio;
    a.position.y -= normal.y * overlap * ratio;
  }
  if (!b.isStatic) {
    const ratio = a.isStatic ? 1 : a.mass / totalMass;
    b.position.x += normal.x * overlap * ratio;
    b.position.y += normal.y * overlap * ratio;
  }

  // Impulse
  const relVel = v.sub(b.velocity, a.velocity);
  const velAlongNormal = v.dot(relVel, normal);
  if (velAlongNormal > 0) return; // separating

  const e = restitution;
  const invMassA = a.isStatic ? 0 : 1 / a.mass;
  const invMassB = b.isStatic ? 0 : 1 / b.mass;
  const j = -(1 + e) * velAlongNormal / (invMassA + invMassB);

  if (!a.isStatic) {
    a.velocity.x -= (j * invMassA) * normal.x;
    a.velocity.y -= (j * invMassA) * normal.y;
  }
  if (!b.isStatic) {
    b.velocity.x += (j * invMassB) * normal.x;
    b.velocity.y += (j * invMassB) * normal.y;
  }
}

function resolveBallRect(
  ball: Ball,
  rect: Box | Platform,
  restitution: number,
  friction: number,
): void {
  // Find closest point on rect to ball center
  const closestX = Math.max(rect.position.x, Math.min(ball.position.x, rect.position.x + rect.width));
  const closestY = Math.max(rect.position.y, Math.min(ball.position.y, rect.position.y + rect.height));

  const diff = v.sub(ball.position, { x: closestX, y: closestY });
  const dist = v.length(diff);

  if (dist >= ball.radius || dist < 1e-6) return;

  const normal = v.normalize(diff);
  const overlap = ball.radius - dist;

  // Separate
  if (!ball.isStatic) {
    ball.position.x += normal.x * overlap;
    ball.position.y += normal.y * overlap;
  }
  if (!rect.isStatic) {
    rect.position.x -= normal.x * overlap;
    rect.position.y -= normal.y * overlap;
  }

  // Impulse
  const relVel = v.sub(ball.velocity, rect.velocity);
  const velAlongNormal = v.dot(relVel, normal);
  if (velAlongNormal > 0) return;

  const e = restitution;
  const invMassA = ball.isStatic ? 0 : 1 / ball.mass;
  const invMassB = rect.isStatic ? 0 : 1 / rect.mass;
  const totalInvMass = invMassA + invMassB;
  if (totalInvMass < 1e-10) return;

  const j = -(1 + e) * velAlongNormal / totalInvMass;

  if (!ball.isStatic) {
    ball.velocity.x += (j * invMassA) * normal.x;
    ball.velocity.y += (j * invMassA) * normal.y;
    // Tangential friction
    const tangent = { x: -normal.y, y: normal.x };
    const velAlongTangent = v.dot(relVel, tangent);
    ball.velocity.x -= friction * 0.2 * velAlongTangent * tangent.x * invMassA;
    ball.velocity.y -= friction * 0.2 * velAlongTangent * tangent.y * invMassA;
  }
  if (!rect.isStatic) {
    rect.velocity.x -= (j * invMassB) * normal.x;
    rect.velocity.y -= (j * invMassB) * normal.y;
  }
}

function resolveRectRect(
  a: Box | Platform,
  b: Box | Platform,
  restitution: number,
  _friction: number,
): void {
  // AABB overlap test
  const aLeft = a.position.x;
  const aRight = a.position.x + a.width;
  const aTop = a.position.y;
  const aBottom = a.position.y + a.height;

  const bLeft = b.position.x;
  const bRight = b.position.x + b.width;
  const bTop = b.position.y;
  const bBottom = b.position.y + b.height;

  const overlapX = Math.min(aRight, bRight) - Math.max(aLeft, bLeft);
  const overlapY = Math.min(aBottom, bBottom) - Math.max(aTop, bTop);

  if (overlapX <= 0 || overlapY <= 0) return;

  // Find minimum separation axis
  let normal: Vec2;
  let overlap: number;

  if (overlapX < overlapY) {
    overlap = overlapX;
    const aCenterX = aLeft + a.width / 2;
    const bCenterX = bLeft + b.width / 2;
    normal = aCenterX < bCenterX ? { x: -1, y: 0 } : { x: 1, y: 0 };
  } else {
    overlap = overlapY;
    const aCenterY = aTop + a.height / 2;
    const bCenterY = bTop + b.height / 2;
    normal = aCenterY < bCenterY ? { x: 0, y: -1 } : { x: 0, y: 1 };
  }

  // Separate
  const totalMass = (a.isStatic ? 0 : a.mass) + (b.isStatic ? 0 : b.mass);
  if (totalMass < 1e-6) return;

  if (!a.isStatic) {
    const ratio = b.isStatic ? 1 : b.mass / totalMass;
    a.position.x += normal.x * overlap * ratio;
    a.position.y += normal.y * overlap * ratio;
  }
  if (!b.isStatic) {
    const ratio = a.isStatic ? 1 : a.mass / totalMass;
    b.position.x -= normal.x * overlap * ratio;
    b.position.y -= normal.y * overlap * ratio;
  }

  // Impulse
  const relVel = v.sub(a.velocity, b.velocity);
  const velAlongNormal = v.dot(relVel, normal);
  if (velAlongNormal > 0) return;

  const e = restitution;
  const invMassA = a.isStatic ? 0 : 1 / a.mass;
  const invMassB = b.isStatic ? 0 : 1 / b.mass;
  const totalInvMass = invMassA + invMassB;
  if (totalInvMass < 1e-10) return;

  const j = -(1 + e) * velAlongNormal / totalInvMass;

  if (!a.isStatic) {
    a.velocity.x += (j * invMassA) * normal.x;
    a.velocity.y += (j * invMassA) * normal.y;
  }
  if (!b.isStatic) {
    b.velocity.x -= (j * invMassB) * normal.x;
    b.velocity.y -= (j * invMassB) * normal.y;
  }
}
