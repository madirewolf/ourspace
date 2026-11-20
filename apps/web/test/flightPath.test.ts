import { describe, expect, it } from "vitest";
import {
  ARRIVE,
  CATCH,
  COCKPIT_EYE,
  RUN_START,
  TAKEOFF,
  avatarPose,
  cameraRig,
  canopyClosed,
  phaseAt,
  planetsArrived,
  shipPose,
  type Vec3,
} from "../src/discovery/flightPath";

const EPSILON = 1e-4;

function distance(a: Vec3, b: Vec3): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

/** Largest jump in any camera channel across a hand-off. */
function rigJump(time: number): number {
  const before = cameraRig(time - EPSILON);
  const after = cameraRig(time + EPSILON);
  return Math.max(
    Math.abs(before.azimuth - after.azimuth),
    Math.abs(before.elevation - after.elevation),
    Math.abs(before.distance - after.distance),
    Math.abs(before.aim - after.aim),
    Math.abs(before.fov - after.fov) / 10,
    Math.abs(before.roll - after.roll),
    Math.abs(before.cockpit - after.cockpit),
  );
}

describe("orbit launch flight path", () => {
  const handOffs = { RUN_START, TAKEOFF, CATCH, ARRIVE };

  it("never teleports the avatar or the ship", () => {
    for (const [name, time] of Object.entries(handOffs)) {
      const avatarGap = distance(
        avatarPose(time - EPSILON).position,
        avatarPose(time + EPSILON).position,
      );
      const shipGap = distance(
        shipPose(time - EPSILON).position,
        shipPose(time + EPSILON).position,
      );
      expect(avatarGap, `avatar at ${name}`).toBeLessThan(0.01);
      expect(shipGap, `ship at ${name}`).toBeLessThan(0.01);
    }
  });

  it("hands the falling avatar to a ship moving at the same speed", () => {
    const falling = avatarPose(CATCH - EPSILON);
    const caught = avatarPose(CATCH + EPSILON);
    expect(distance(falling.velocity, caught.velocity)).toBeLessThan(0.01);
    expect(
      distance(shipPose(CATCH - EPSILON).velocity, shipPose(CATCH + EPSILON).velocity),
    ).toBeLessThan(0.01);
    expect(Math.abs(falling.yaw - caught.yaw)).toBeLessThan(0.01);
    expect(Math.abs(falling.pitch - caught.pitch)).toBeLessThan(0.01);
    expect(Math.abs(falling.roll - caught.roll)).toBeLessThan(0.01);
  });

  it("speeds the run up from standing and keeps the stride in step with the ground", () => {
    expect(avatarPose(RUN_START).gaitAmount).toBe(0);
    const late = avatarPose(TAKEOFF - 0.2);
    expect(late.gaitAmount).toBeCloseTo(1, 5);
    const step = avatarPose(TAKEOFF - 0.1);
    // Phase advances in proportion to distance, so feet never slide.
    const ratio = (step.gaitPhase - late.gaitPhase) / (step.position[0] - late.position[0]);
    const early = avatarPose(RUN_START + 1.2);
    const earlier = avatarPose(RUN_START + 1.1);
    expect(
      (early.gaitPhase - earlier.gaitPhase) / (early.position[0] - earlier.position[0]),
    ).toBeCloseTo(ratio, 5);
  });

  it("moves the camera without jumps at every hand-off", () => {
    for (const [name, time] of Object.entries(handOffs)) {
      expect(rigJump(time), `camera at ${name}`).toBeLessThan(0.01);
    }
  });

  it("parks everything in the cockpit by the time the ship arrives", () => {
    expect(cameraRig(ARRIVE).cockpit).toBe(1);
    expect(canopyClosed(ARRIVE)).toBe(1);
    expect(planetsArrived(ARRIVE + 0.6)).toBe(1);
    expect(distance(shipPose(ARRIVE).position, [0, 0, 0])).toBeLessThan(1e-3);
    expect(distance(shipPose(ARRIVE).velocity, [0, 0, 0])).toBeLessThan(1e-6);
    expect(COCKPIT_EYE[1]).toBeGreaterThan(0);
    expect(phaseAt(ARRIVE)).toBe("arrived");
  });

  it("keeps the ship below the avatar until the catch", () => {
    for (let time = TAKEOFF - 0.5; time < CATCH; time += 0.05) {
      expect(shipPose(time).position[1]).toBeLessThan(avatarPose(time).position[1]);
    }
  });
});
