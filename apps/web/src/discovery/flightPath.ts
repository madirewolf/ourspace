/**
 * The orbit launch as one continuous piece of motion: a sprint that speeds up
 * from standing, a ballistic leap off the end of the profile, a fall that
 * reaches terminal speed, a ship that matches that speed to catch the avatar,
 * and a settle into the cockpit. Every curve is a pure function of time and
 * every hand-off keeps position and velocity, so nothing snaps between phases.
 *
 * World layout: the ship comes to rest at the origin, facing -z, where the
 * discovery cockpit camera lives. The profile ledge floats high above it.
 */

export type Vec3 = [number, number, number];

// ---- Timeline (seconds from the first visible frame) ----

/** The camera settles in while the canvas fades up; then the run starts. */
export const RUN_START = 0.45;
const RUN_ACCEL = 0.55;
const RUN_SPEED = 4.6;
const RUN_DISTANCE = 8.6;
/** Distance covered while accelerating, from integrating a smoothstep speed ramp. */
const ACCEL_DISTANCE = (RUN_SPEED * RUN_ACCEL) / 2;
export const TAKEOFF = RUN_START + RUN_ACCEL + (RUN_DISTANCE - ACCEL_DISTANCE) / RUN_SPEED;
const FALL_TIME = 1.9;
export const CATCH = TAKEOFF + FALL_TIME;
/** The ship brakes from the avatar's falling speed to rest. */
const SETTLE_TIME = 1.6;
export const ARRIVE = CATCH + 2.5;

// ---- Fall physics ----

const JUMP_SPEED = 3.3;
const GRAVITY = 9.8;
/** Linear air drag: falling speed approaches GRAVITY / AIR_DRAG. */
const AIR_DRAG = 1.2;
const TERMINAL_SPEED = GRAVITY / AIR_DRAG;
/** Run speed bleeds off sideways after the leap. */
const DRIFT_DRAG = 1.5;

/** Where the avatar stands in the cockpit, in ship space. */
export const SEAT: Vec3 = [0, 0.35, 3.08];
/** The cockpit camera, in ship space. */
export const COCKPIT_EYE: Vec3 = [0, 1.7, 2.86];
export const COCKPIT_LOOK: Vec3 = [0, 0.72, -10.2];

function fallOffset(time: number): { position: Vec3; velocity: Vec3 } {
  const sideways = Math.exp(-DRIFT_DRAG * time);
  const vertical = Math.exp(-AIR_DRAG * time);
  const lift = JUMP_SPEED + TERMINAL_SPEED;
  return {
    position: [
      (RUN_SPEED / DRIFT_DRAG) * (1 - sideways),
      -TERMINAL_SPEED * time + (lift / AIR_DRAG) * (1 - vertical),
      0,
    ],
    velocity: [RUN_SPEED * sideways, -TERMINAL_SPEED + lift * vertical, 0],
  };
}

const fallAtCatch = fallOffset(FALL_TIME);
/** The avatar's velocity at the catch, which the ship matches. */
const CATCH_VELOCITY = fallAtCatch.velocity;
/**
 * The ship catches the avatar here and brakes evenly to the origin, so the
 * catch point sits half a braking distance back along the falling direction.
 */
const SHIP_AT_CATCH: Vec3 = [
  (-CATCH_VELOCITY[0] * SETTLE_TIME) / 2,
  (-CATCH_VELOCITY[1] * SETTLE_TIME) / 2,
  (-CATCH_VELOCITY[2] * SETTLE_TIME) / 2,
];
const AVATAR_AT_CATCH = add(SHIP_AT_CATCH, SEAT);
/** The avatar leaves the ledge here; everything before is laid out from it. */
export const TAKEOFF_POINT: Vec3 = [
  AVATAR_AT_CATCH[0] - fallAtCatch.position[0],
  AVATAR_AT_CATCH[1] - fallAtCatch.position[1],
  AVATAR_AT_CATCH[2] - fallAtCatch.position[2],
];
export const RUN_START_POINT: Vec3 = [
  TAKEOFF_POINT[0] - RUN_DISTANCE,
  TAKEOFF_POINT[1],
  TAKEOFF_POINT[2],
];

/** The ship starts far below the avatar and swoops up beneath it. */
const SHIP_APPROACH_START = TAKEOFF - 0.5;
const SHIP_APPROACH_FROM: Vec3 = [2.2, -15, -4];

// ---- Small math ----

function add(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export function smoothstep01(value: number): number {
  const x = clamp01(value);
  return x * x * (3 - 2 * x);
}

export function smootherstep01(value: number): number {
  const x = clamp01(value);
  return x * x * x * (x * (x * 6 - 15) + 10);
}

/**
 * Monotone cubic through keyframes: passes every key, carries speed through
 * them instead of stopping, and never overshoots between two keys.
 */
export function keyframes(keys: ReadonlyArray<readonly [number, number]>, time: number): number {
  const last = keys.length - 1;
  if (time <= keys[0]![0]) return keys[0]![1];
  if (time >= keys[last]![0]) return keys[last]![1];
  let index = 0;
  while (time > keys[index + 1]![0]) index++;
  const slope = (at: number) => {
    if (at <= 0 || at >= last) return 0;
    const [t0, v0] = keys[at - 1]!;
    const [t1, v1] = keys[at]!;
    const [t2, v2] = keys[at + 1]!;
    const left = (v1 - v0) / (t1 - t0);
    const right = (v2 - v1) / (t2 - t1);
    if (left * right <= 0) return 0;
    // Weighted harmonic mean (Fritsch–Carlson): stays monotone between keys.
    const w1 = 2 * (t2 - t1) + (t1 - t0);
    const w2 = t2 - t1 + 2 * (t1 - t0);
    return (w1 + w2) / (w1 / left + w2 / right);
  };
  const [t0, v0] = keys[index]!;
  const [t1, v1] = keys[index + 1]!;
  const span = t1 - t0;
  const s = (time - t0) / span;
  const s2 = s * s;
  const s3 = s2 * s;
  return (
    (2 * s3 - 3 * s2 + 1) * v0 +
    (s3 - 2 * s2 + s) * span * slope(index) +
    (-2 * s3 + 3 * s2) * v1 +
    (s3 - s2) * span * slope(index + 1)
  );
}

// ---- The avatar ----

export interface AvatarPose {
  position: Vec3;
  velocity: Vec3;
  /** Euler angles in YXZ order: turn, then lean forward, then sway. */
  yaw: number;
  pitch: number;
  roll: number;
  /** Gait cycle in radians and stride strength, for feet that never slide. */
  gaitPhase: number;
  gaitAmount: number;
  /** True once the avatar rides the ship; use the ship's seat transform instead. */
  seated: boolean;
}

/** One full gait cycle (two steps) covers this much ground. */
const CYCLE_LENGTH = 2.25;

function runDistance(time: number): { distance: number; speed: number } {
  const t = time - RUN_START;
  if (t <= 0) return { distance: 0, speed: 0 };
  if (t < RUN_ACCEL) {
    const u = t / RUN_ACCEL;
    return {
      distance: RUN_SPEED * RUN_ACCEL * (u * u * u - (u * u * u * u) / 2),
      speed: RUN_SPEED * u * u * (3 - 2 * u),
    };
  }
  return { distance: ACCEL_DISTANCE + RUN_SPEED * (t - RUN_ACCEL), speed: RUN_SPEED };
}

const YAW_RUN = Math.PI / 2;
const YAW_SEATED = Math.PI;
const AVATAR_YAW: ReadonlyArray<readonly [number, number]> = [
  [TAKEOFF, YAW_RUN],
  [TAKEOFF + 0.9, YAW_RUN + 0.3],
  [CATCH - 0.25, YAW_SEATED],
];
const AVATAR_PITCH: ReadonlyArray<readonly [number, number]> = [
  [TAKEOFF, 0],
  [TAKEOFF + 0.3, 0.12],
  [TAKEOFF + 1.0, 0.38],
  [CATCH - 0.45, 0.2],
  [CATCH - 0.12, 0],
];

export function avatarPose(time: number): AvatarPose {
  if (time < TAKEOFF) {
    const { distance, speed } = runDistance(time);
    return {
      position: [RUN_START_POINT[0] + distance, RUN_START_POINT[1], RUN_START_POINT[2]],
      velocity: [speed, 0, 0],
      yaw: YAW_RUN,
      pitch: 0,
      roll: 0,
      gaitPhase: (distance / CYCLE_LENGTH) * Math.PI * 2,
      gaitAmount: speed / RUN_SPEED,
      seated: false,
    };
  }
  if (time < CATCH) {
    const t = time - TAKEOFF;
    const fall = fallOffset(t);
    const sway = Math.sin(t * 2.6) * 0.09 * smoothstep01((t - 0.3) / 0.5);
    return {
      position: add(TAKEOFF_POINT, fall.position),
      velocity: fall.velocity,
      yaw: keyframes(AVATAR_YAW, time),
      pitch: keyframes(AVATAR_PITCH, time),
      roll: sway * (1 - smoothstep01((time - (CATCH - 0.5)) / 0.4)),
      gaitPhase: 0,
      gaitAmount: 0,
      seated: false,
    };
  }
  const ship = shipPose(time);
  return {
    position: add(ship.position, SEAT),
    velocity: ship.velocity,
    yaw: YAW_SEATED,
    pitch: 0,
    roll: 0,
    gaitPhase: 0,
    gaitAmount: 0,
    seated: true,
  };
}

// ---- The ship ----

export interface ShipPose {
  position: Vec3;
  velocity: Vec3;
  /** Nose up (+x) and bank (z), in radians. */
  pitch: number;
  roll: number;
}

/** A smooth bump that starts and ends flat, peaking at `peak` seconds. */
function impulse(time: number, peak: number): number {
  if (time <= 0) return 0;
  const x = time / peak;
  return x * x * Math.exp(2 * (1 - x));
}

export function shipPose(time: number): ShipPose {
  if (time >= CATCH) {
    // Brake evenly to rest: p = p0 (1 - s)², which leaves at the catch velocity.
    const s = Math.min(1, (time - CATCH) / SETTLE_TIME);
    const remain = (1 - s) * (1 - s);
    const rate = (-2 * (1 - s)) / SETTLE_TIME;
    const sag = -0.22 * impulse(time - CATCH, 0.3);
    return {
      position: [
        SHIP_AT_CATCH[0] * remain,
        SHIP_AT_CATCH[1] * remain + sag,
        SHIP_AT_CATCH[2] * remain,
      ],
      velocity: [SHIP_AT_CATCH[0] * rate, SHIP_AT_CATCH[1] * rate, SHIP_AT_CATCH[2] * rate],
      // The weight of the catch dips the nose, then the ship levels out.
      pitch: -0.09 * impulse(time - CATCH, 0.32),
      roll: 0.035 * impulse(time - CATCH, 0.55),
    };
  }
  // Before the catch the ship flies relative to the falling avatar: it closes
  // in from below on a curve and matches the avatar's speed exactly at contact.
  const span = CATCH - SHIP_APPROACH_START;
  const raw = clamp01((time - SHIP_APPROACH_START) / span);
  const away = 1 - smoothstep01(raw);
  const closing = (6 * raw * (1 - raw)) / span; // d(1 - away)/dt
  const root = Math.sqrt(away);
  const avatar = avatarPose(time);
  const [fromX, fromY, fromZ] = SHIP_APPROACH_FROM;
  return {
    position: [
      avatar.position[0] - SEAT[0] + fromX * away * away,
      avatar.position[1] - SEAT[1] + fromY * away,
      avatar.position[2] - SEAT[2] + fromZ * away * root,
    ],
    velocity: [
      avatar.velocity[0] - fromX * 2 * away * closing,
      avatar.velocity[1] - fromY * closing,
      avatar.velocity[2] - fromZ * 1.5 * root * closing,
    ],
    pitch: 0.22 * away * away,
    roll: -0.34 * away * root,
  };
}

// ---- The camera ----

/**
 * The camera orbits the avatar on keyframed spherical coordinates — azimuth
 * around the avatar (0 looks from +z), elevation, distance — then hands over to
 * the cockpit eye. Keys are monotone cubics, so it keeps moving through them.
 */
const CAMERA_KEYS = {
  azimuth: [
    [0, 0.14],
    [RUN_START, 0.02],
    [1.6, -0.3],
    [TAKEOFF, -0.72],
    [TAKEOFF + 0.45, -1.02],
    [TAKEOFF + 1.15, -0.72],
    [CATCH - 0.3, -0.3],
    [CATCH, -0.12],
    [CATCH + 0.6, 0],
  ],
  elevation: [
    [0, 0.3],
    [RUN_START, 0.25],
    [1.6, 0.21],
    [TAKEOFF, 0.34],
    [TAKEOFF + 0.45, 0.7],
    [TAKEOFF + 1.15, 1.1],
    [CATCH - 0.3, 0.95],
    [CATCH, 0.72],
    [CATCH + 0.6, 0.44],
    [ARRIVE, 0.32],
  ],
  distance: [
    [0, 6.7],
    [RUN_START, 5.7],
    [1.6, 4.95],
    [TAKEOFF, 4.6],
    [TAKEOFF + 0.45, 4.4],
    [TAKEOFF + 1.15, 4.6],
    [CATCH - 0.3, 5.0],
    [CATCH, 5.3],
    [CATCH + 0.6, 5.0],
    [ARRIVE, 4.6],
  ],
  /** Height above the avatar's feet the lens aims at; negative looks below them. */
  aim: [
    [0, 1.0],
    [RUN_START, 0.95],
    [1.6, 0.9],
    [TAKEOFF, 0.75],
    [TAKEOFF + 0.45, 0.3],
    [TAKEOFF + 1.15, -0.6],
    [CATCH - 0.3, -0.2],
    [CATCH, 0.4],
    [CATCH + 0.6, 1.2],
    [ARRIVE, 1.4],
  ],
  fov: [
    [0, 44],
    [RUN_START, 46],
    [1.6, 50],
    [TAKEOFF, 54],
    [TAKEOFF + 0.45, 58],
    [TAKEOFF + 1.15, 64],
    [CATCH - 0.3, 60],
    [CATCH, 56],
    [CATCH + 0.6, 52],
    [ARRIVE, 48],
  ],
  roll: [
    [0, 0],
    [1.6, -0.01],
    [TAKEOFF, -0.03],
    [TAKEOFF + 0.45, -0.05],
    [TAKEOFF + 1.15, 0.03],
    [CATCH, 0],
  ],
} satisfies Record<string, ReadonlyArray<readonly [number, number]>>;

export interface CameraRig {
  azimuth: number;
  elevation: number;
  distance: number;
  aim: number;
  fov: number;
  roll: number;
  /** 0 orbiting the avatar, 1 at the cockpit eye. */
  cockpit: number;
}

const COCKPIT_BLEND_START = CATCH + 0.5;

export function cameraRig(time: number): CameraRig {
  return {
    azimuth: keyframes(CAMERA_KEYS.azimuth, time),
    elevation: keyframes(CAMERA_KEYS.elevation, time),
    distance: keyframes(CAMERA_KEYS.distance, time),
    aim: keyframes(CAMERA_KEYS.aim, time),
    fov: keyframes(CAMERA_KEYS.fov, time),
    roll: keyframes(CAMERA_KEYS.roll, time),
    cockpit: smootherstep01((time - COCKPIT_BLEND_START) / (ARRIVE - COCKPIT_BLEND_START)),
  };
}

// ---- Everything else ----

/** Gull-wing canopy: 0 open, 1 shut. */
export function canopyClosed(time: number): number {
  return smoothstep01((time - (CATCH + 0.35)) / 1.1);
}

/** Planets glide out of the haze as the ship arrives: 0 hidden, 1 in place. */
export function planetsArrived(time: number): number {
  const u = clamp01((time - (CATCH + 0.4)) / (ARRIVE + 0.5 - (CATCH + 0.4)));
  return 1 - (1 - u) ** 3;
}

export type FlightPhase = "depart" | "sprint" | "leap" | "fall" | "catch" | "merge" | "arrived";

export function phaseAt(time: number): FlightPhase {
  if (time < RUN_START) return "depart";
  // The crouch before the leap starts on the last stride.
  if (time < TAKEOFF - 0.1) return "sprint";
  // Arms reach into the fall around the top of the arc.
  if (time < TAKEOFF + 0.3) return "leap";
  if (time < CATCH - 0.04) return "fall";
  if (time < CATCH + 0.7) return "catch";
  if (time < ARRIVE) return "merge";
  return "arrived";
}
