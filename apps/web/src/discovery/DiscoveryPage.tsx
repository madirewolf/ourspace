import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Avatar, type AvatarGait, type AvatarMotion } from "@ourspace/avatar";
import { CRAFTS, createRng, lerp, smoothstep, type ProfileDoc } from "@ourspace/core";
import { AvatarStage } from "../components/AvatarStage";
import { Prewarm } from "../components/Prewarm";
import { glowTexture } from "../components/glowTexture";
import { useApp, type DiscoveryMode } from "../store";
import { DISCOVERY_CREATORS, sharedCraftCount, type DiscoveryCreator } from "./catalog";
import { Spaceship } from "./Spaceship";
import { useNavigate } from "../navigation";
import {
  ARRIVE,
  COCKPIT_EYE,
  COCKPIT_LOOK,
  RUN_START_POINT,
  SEAT,
  TAKEOFF_POINT,
  avatarPose,
  cameraRig,
  canopyClosed,
  phaseAt,
  planetsArrived,
  shipPose,
  type FlightPhase,
} from "./flightPath";

const MODES: Array<{ id: DiscoveryMode; label: string; mark: string }> = [
  { id: "all", label: "All worlds", mark: "∞" },
  { id: "friends", label: "Friends", mark: "♥" },
  { id: "similar", label: "Same wave", mark: "≈" },
  { id: "opposite", label: "Opposites", mark: "↯" },
  { id: "random", label: "Surprise me", mark: "?" },
  { id: "new", label: "New signals", mark: "+" },
];

const PLANET_POSITIONS: Array<[number, number, number]> = [
  [-4.2, 2.1, -8.5],
  [-1.35, 0.75, -10.8],
  [3.1, 2.15, -9.7],
  [-3.2, -1.25, -12.5],
  [0.75, -1.1, -11.8],
  [4.25, -0.35, -13.3],
];

function seededOrder(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

const SKY_DEEP = new THREE.Color("#05040d");
const SKY_LOBES: Array<{ direction: THREE.Vector3; color: THREE.Color; power: number }> = [
  {
    direction: new THREE.Vector3(-0.72, 0.38, -1).normalize(),
    color: new THREE.Color("#4a1048").multiplyScalar(0.75),
    power: 6,
  },
  {
    direction: new THREE.Vector3(0.85, -0.22, -0.9).normalize(),
    color: new THREE.Color("#0a3f48").multiplyScalar(0.75),
    power: 5,
  },
  {
    direction: new THREE.Vector3(0.1, 0.9, -0.5).normalize(),
    color: new THREE.Color("#1d1450").multiplyScalar(0.8),
    power: 4,
  },
  {
    direction: new THREE.Vector3(-0.2, -1, -0.15).normalize(),
    color: new THREE.Color("#2c0f3e").multiplyScalar(0.8),
    power: 4,
  },
];

/**
 * Faceted nebula dome: one draw call, per-face colours, so deep space reads as
 * a painted PS2 skybox instead of a flat black void. Follows the camera so it
 * always sits at infinity.
 */
function NebulaSky() {
  const sky = useRef<THREE.Mesh>(null);
  const geometry = useMemo(() => {
    const value = new THREE.IcosahedronGeometry(60, 5);
    const position = value.getAttribute("position");
    const colors = new Float32Array(position.count * 3);
    const a = new THREE.Vector3();
    const b = new THREE.Vector3();
    const c = new THREE.Vector3();
    const color = new THREE.Color();
    for (let index = 0; index < position.count; index += 3) {
      a.fromBufferAttribute(position, index);
      b.fromBufferAttribute(position, index + 1);
      c.fromBufferAttribute(position, index + 2);
      const normal = a.add(b).add(c).normalize();
      color.copy(SKY_DEEP);
      for (const lobe of SKY_LOBES) {
        const weight = Math.max(0, normal.dot(lobe.direction)) ** lobe.power;
        color.r += lobe.color.r * weight;
        color.g += lobe.color.g * weight;
        color.b += lobe.color.b * weight;
      }
      const grain = Math.sin(index * 12.9898) * 43758.5453;
      color.multiplyScalar(0.88 + (grain - Math.floor(grain)) * 0.24);
      for (let vertex = 0; vertex < 3; vertex++) {
        colors[(index + vertex) * 3] = color.r;
        colors[(index + vertex) * 3 + 1] = color.g;
        colors[(index + vertex) * 3 + 2] = color.b;
      }
    }
    value.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return value;
  }, []);

  useFrame((state) => {
    sky.current?.position.copy(state.camera.position);
  });

  return (
    <mesh ref={sky} geometry={geometry} renderOrder={-1} frustumCulled={false}>
      <meshBasicMaterial
        vertexColors
        side={THREE.BackSide}
        fog={false}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}

const COCKPIT_EYE_POINT = new THREE.Vector3(...COCKPIT_EYE);

/**
 * Distant stars. The flight moves them at a tenth of the camera's speed, so
 * they read as far away while the camera drops fifteen metres.
 */
function StarField({ fieldRef }: { fieldRef: React.RefObject<THREE.Points | null> }) {
  const points = useMemo(() => {
    const values = new Float32Array(300 * 3);
    for (let index = 0; index < 300; index++) {
      const a = Math.sin(index * 12.9898) * 43758.5453;
      const b = Math.sin(index * 78.233 + 4.1) * 24634.6345;
      const c = Math.sin(index * 39.425 + 9.7) * 13579.2468;
      values[index * 3] = (a - Math.floor(a) - 0.5) * 34;
      values[index * 3 + 1] = (b - Math.floor(b) - 0.5) * 20;
      values[index * 3 + 2] = -4 - (c - Math.floor(c)) * 28;
    }
    return values;
  }, []);

  useFrame((state, delta) => {
    if (!fieldRef.current) return;
    fieldRef.current.rotation.z += delta * 0.003;
    fieldRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.07) * 0.018;
  });

  return (
    <points ref={fieldRef} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[points, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#d8efff" size={0.052} sizeAttenuation transparent opacity={0.88} />
    </points>
  );
}

const DUST_COUNT = 520;

/**
 * Motes fixed in the world around the fall. They are the only thing near the
 * camera between the ledge and the ship, so they carry the sense of speed.
 */
function SpaceDust() {
  const positions = useMemo(() => {
    const rng = createRng("orbit-space-dust");
    const values = new Float32Array(DUST_COUNT * 3);
    let filled = 0;
    while (filled < DUST_COUNT) {
      const x = -20 + rng() * 34;
      const y = -6 + rng() * 28;
      const z = -16 + rng() * 28;
      // Keep the cockpit view clear; dust belongs to the journey.
      if (x * x + y * y + z * z < 36) continue;
      values[filled * 3] = x;
      values[filled * 3 + 1] = y;
      values[filled * 3 + 2] = z;
      filled++;
    }
    return values;
  }, []);
  const map = useMemo(() => glowTexture(), []);

  return (
    <points frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        map={map}
        color="#bcd6ff"
        size={0.11}
        sizeAttenuation
        transparent
        opacity={0.75}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </points>
  );
}

const STREAK_COUNT = 64;
const STREAK_NEAR = -1;
const STREAK_FAR = -13;
const STREAK_SPAN = STREAK_NEAR - STREAK_FAR;
const STREAK_COLOR = new THREE.Color("#a8f8ff");
const FORWARD = new THREE.Vector3(0, 0, -1);

/**
 * Air streaks around the camera, laid along the direction of travel and
 * scrolled by the distance actually covered, so they speed up and slow down
 * with the fall. Each streak fades in far away and out before it reaches the
 * lens; nothing pops when one wraps around.
 */
function createSpeedLines() {
  const rng = createRng("orbit-speed-lines");
  const streaks = Array.from({ length: STREAK_COUNT }, () => {
    const angle = rng() * Math.PI * 2;
    const radius = 0.9 + rng() * 4.1;
    return {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
      offset: rng() * STREAK_SPAN,
      length: 0.7 + rng() * 1.5,
    };
  });
  const positions = new Float32Array(STREAK_COUNT * 6);
  const colors = new Float32Array(STREAK_COUNT * 6);
  const positionAttribute = new THREE.BufferAttribute(positions, 3).setUsage(
    THREE.DynamicDrawUsage,
  );
  const colorAttribute = new THREE.BufferAttribute(colors, 3).setUsage(THREE.DynamicDrawUsage);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", positionAttribute);
  geometry.setAttribute("color", colorAttribute);
  const material = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
    fog: false,
  });
  const object = new THREE.LineSegments(geometry, material);
  object.frustumCulled = false;
  object.renderOrder = 2;
  const heading = new THREE.Quaternion();
  const direction = new THREE.Vector3();
  let travel = 0;
  let aimed = false;

  function update(origin: THREE.Vector3, velocity: THREE.Vector3, delta: number) {
    const speed = velocity.length();
    material.opacity = smoothstep(4.8, 7.5, speed) * 0.9;
    if (speed > 0.5) {
      heading.setFromUnitVectors(FORWARD, direction.copy(velocity).divideScalar(speed));
      if (aimed) object.quaternion.slerp(heading, 1 - Math.exp(-delta * 6));
      else object.quaternion.copy(heading);
      aimed = true;
    }
    object.position.copy(origin);
    travel += speed * delta * 1.35;
    if (material.opacity <= 0.001) return;
    for (let index = 0; index < STREAK_COUNT; index++) {
      const streak = streaks[index]!;
      const head = STREAK_FAR + ((streak.offset + travel) % STREAK_SPAN);
      const tail = head - streak.length;
      const fade =
        smoothstep(STREAK_FAR, STREAK_FAR + 3, tail) *
        (1 - smoothstep(STREAK_NEAR - 2.5, STREAK_NEAR, head));
      const offset = index * 6;
      positions[offset] = streak.x;
      positions[offset + 1] = streak.y;
      positions[offset + 2] = head;
      positions[offset + 3] = streak.x;
      positions[offset + 4] = streak.y;
      positions[offset + 5] = tail;
      colors[offset] = STREAK_COLOR.r * fade;
      colors[offset + 1] = STREAK_COLOR.g * fade;
      colors[offset + 2] = STREAK_COLOR.b * fade;
      colors[offset + 3] = STREAK_COLOR.r * fade * 0.12;
      colors[offset + 4] = STREAK_COLOR.g * fade * 0.12;
      colors[offset + 5] = STREAK_COLOR.b * fade * 0.12;
    }
    positionAttribute.needsUpdate = true;
    colorAttribute.needsUpdate = true;
  }

  return {
    object,
    update,
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}

/** The profile ledge sits so its far edge is just past where the run ends. */
const LEDGE_HALF_WIDTH = 5.3;
const LEDGE_POSITION: [number, number, number] = [
  TAKEOFF_POINT[0] + 0.3 - LEDGE_HALF_WIDTH,
  TAKEOFF_POINT[1],
  TAKEOFF_POINT[2],
];
const LEDGE_TILES = [
  { x: -4.25, color: "#6f35d8", glow: "#ff55ca", tilt: 0.05 },
  { x: -2.55, color: "#0c8f88", glow: "#54ffdc", tilt: -0.04 },
  { x: -0.85, color: "#ca4d18", glow: "#ffbd39", tilt: 0.06 },
  { x: 0.85, color: "#3158a1", glow: "#65a7ff", tilt: -0.05 },
  { x: 2.55, color: "#a23a7a", glow: "#ff8ad8", tilt: 0.04 },
  { x: 4.25, color: "#2f7a3c", glow: "#c8ff32", tilt: -0.06 },
];
const LEDGE_NOTES = [-4.6, -2.9, -1.2, 0.5, 2.2, 3.9];

/**
 * Your profile as a floating slab: the moodboard you just left is the runway.
 * Top face at y = 0, the running line along z = 0, the edge at x = +5.3.
 */
function MoodboardLedge() {
  return (
    <group position={LEDGE_POSITION}>
      <mesh position={[0, -0.21, 0.6]}>
        <boxGeometry args={[LEDGE_HALF_WIDTH * 2, 0.42, 4.4]} />
        <meshStandardMaterial
          color="#11121b"
          emissive="#2a1342"
          emissiveIntensity={0.35}
          roughness={0.9}
          flatShading
        />
      </mesh>
      {LEDGE_TILES.map((tile) => (
        <mesh key={tile.x} position={[tile.x, 0.012, 0.35]} rotation={[-Math.PI / 2, 0, tile.tilt]}>
          <planeGeometry args={[1.42, 2.2]} />
          <meshStandardMaterial
            color={tile.color}
            emissive={tile.glow}
            emissiveIntensity={0.18}
            roughness={0.82}
          />
        </mesh>
      ))}
      {LEDGE_NOTES.map((x, index) => (
        <mesh
          key={x}
          position={[x, 0.2, -1.42]}
          rotation={[-0.12, index % 2 ? 0.08 : -0.06, index % 2 ? 0.12 : -0.08]}
        >
          <boxGeometry args={[0.78, 0.38, 0.05]} />
          <meshStandardMaterial
            color={index % 2 ? "#c8ff32" : "#ff4dd8"}
            emissive={index % 2 ? "#708f18" : "#7d1f69"}
            emissiveIntensity={0.35}
            flatShading
          />
        </mesh>
      ))}
      {/* The edge of your page: a cyan lip marks where the run ends. */}
      <mesh position={[LEDGE_HALF_WIDTH, 0.03, 0.6]}>
        <boxGeometry args={[0.14, 0.12, 4.4]} />
        <meshStandardMaterial color="#1b6f63" emissive="#54ffdc" emissiveIntensity={0.85} />
      </mesh>
      <mesh position={[0, -0.03, 2.8]}>
        <boxGeometry args={[LEDGE_HALF_WIDTH * 2, 0.08, 0.06]} />
        <meshStandardMaterial color="#ff4dd8" emissive="#ff4dd8" emissiveIntensity={1.1} />
      </mesh>
      {/* Lifted clear of the running line: a rim of cyan on the leap, not a white-out. */}
      <pointLight position={[4.4, 2.6, 1.9]} color="#54ffdc" intensity={4} distance={7} />
    </group>
  );
}

function Planet({
  creator,
  position,
  selected,
  onSelect,
}: {
  creator: DiscoveryCreator;
  position: [number, number, number];
  selected: boolean;
  onSelect: () => void;
}) {
  const group = useRef<THREE.Group>(null);
  const planet = useRef<THREE.Mesh>(null);
  useFrame((state, delta) => {
    if (planet.current) {
      planet.current.rotation.y += delta * 0.18;
      planet.current.rotation.z += delta * 0.035;
    }
    if (group.current) {
      const targetScale = selected ? 1.28 : 1;
      const scale = THREE.MathUtils.lerp(
        group.current.scale.x,
        targetScale,
        1 - Math.exp(-8 * delta),
      );
      group.current.scale.setScalar(scale);
      group.current.position.y =
        position[1] + Math.sin(state.clock.elapsedTime * 0.8 + position[0]) * 0.13;
    }
  });

  return (
    <group
      ref={group}
      position={position}
      onClick={(event) => {
        event.stopPropagation();
        onSelect();
      }}
    >
      <mesh ref={planet}>
        <icosahedronGeometry args={[0.9, 2]} />
        <meshStandardMaterial
          color={creator.planetColor}
          emissive={creator.planetAccent}
          emissiveIntensity={selected ? 0.7 : 0.22}
          roughness={0.72}
          flatShading
        />
      </mesh>
      <mesh rotation={[Math.PI / 2.35, 0.25, 0]}>
        <torusGeometry args={[1.22, 0.035, 5, 32]} />
        <meshBasicMaterial
          color={creator.planetAccent}
          transparent
          opacity={selected ? 1 : 0.48}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[1.28, 0.35, 0]}>
        <dodecahedronGeometry args={[0.16, 0]} />
        <meshStandardMaterial
          color="#e7e4ff"
          emissive={creator.planetAccent}
          emissiveIntensity={0.4}
          flatShading
        />
      </mesh>
    </group>
  );
}

/**
 * Critically damped follow (the classic SmoothDamp). It rounds off the one
 * corner in the avatar's path, the kick of the leap, without the lag of a
 * plain lerp.
 */
function smoothDamp(
  current: THREE.Vector3,
  target: THREE.Vector3,
  velocity: THREE.Vector3,
  smoothTime: number,
  delta: number,
) {
  const omega = 2 / smoothTime;
  const x = omega * delta;
  const decay = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
  for (let axis = 0; axis < 3; axis++) {
    const change = current.getComponent(axis) - target.getComponent(axis);
    const pull = (velocity.getComponent(axis) + omega * change) * delta;
    velocity.setComponent(axis, (velocity.getComponent(axis) - omega * pull) * decay);
    current.setComponent(axis, target.getComponent(axis) + (change + pull) * decay);
  }
}

/** A replayed visit starts here: ship parked, canopy shut, planets in place. */
const SETTLED_TIME = ARRIVE + 0.6;

function FlightScene({
  profile,
  skipIntro,
  avatarMotion,
  creators,
  selectedId,
  onSelect,
  onPhase,
}: {
  profile: ProfileDoc;
  skipIntro: boolean;
  avatarMotion: AvatarMotion;
  creators: DiscoveryCreator[];
  selectedId: string;
  onSelect: (id: string) => void;
  onPhase: (phase: FlightPhase) => void;
}) {
  const avatar = useRef<THREE.Group>(null);
  const ship = useRef<THREE.Group>(null);
  const canopyLeft = useRef<THREE.Group>(null);
  const canopyRight = useRef<THREE.Group>(null);
  const stars = useRef<THREE.Points>(null);
  const planetField = useRef<THREE.Group>(null);
  const selectionLight = useRef<THREE.PointLight>(null);
  const gait = useRef<AvatarGait>({ phase: 0, amount: 0 });
  const flightTime = useRef<number | null>(null);
  const avatarFade = useRef(1);
  const lastPhase = useRef<FlightPhase | null>(null);
  const speedLines = useMemo(() => createSpeedLines(), []);
  useEffect(() => () => speedLines.dispose(), [speedLines]);
  const rig = useMemo(
    () => ({
      focus: new THREE.Vector3(),
      focusVelocity: new THREE.Vector3(),
      target: new THREE.Vector3(),
      eye: new THREE.Vector3(),
      look: new THREE.Vector3(),
      cockpitEye: new THREE.Vector3(),
      cockpitLook: new THREE.Vector3(),
      velocity: new THREE.Vector3(),
      seat: new THREE.Vector3(),
      head: new THREE.Vector3(),
      seatTurn: new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI),
      lightTarget: new THREE.Vector3(),
      accent: new THREE.Color(),
    }),
    [],
  );
  const selectedIndex = creators.findIndex((creator) => creator.id === selectedId);
  const accent = creators[selectedIndex]?.planetAccent ?? "#ffffff";

  useFrame((state, rawDelta) => {
    const avatarGroup = avatar.current;
    const shipGroup = ship.current;
    if (!avatarGroup || !shipGroup || !canopyLeft.current || !canopyRight.current) return;
    // One long frame (a tab switch, a GC pause) must not skip a beat of the flight.
    const delta = Math.min(rawDelta, 1 / 30);
    const firstFrame = flightTime.current === null;
    const time = firstFrame ? (skipIntro ? SETTLED_TIME : 0) : flightTime.current! + delta;
    flightTime.current = time;
    const camera = state.camera;

    const phase = phaseAt(time);
    if (phase !== lastPhase.current) {
      lastPhase.current = phase;
      onPhase(phase);
    }

    // ---- Ship ----
    const shipNow = shipPose(time);
    shipGroup.position.set(...shipNow.position);
    shipGroup.rotation.set(shipNow.pitch, 0, shipNow.roll);
    shipGroup.updateMatrixWorld();
    const closed = canopyClosed(time);
    canopyLeft.current.rotation.z = lerp(1.05, 0, closed);
    canopyRight.current.rotation.z = lerp(-1.05, 0, closed);

    // ---- Avatar ----
    const pose = avatarPose(time);
    gait.current.phase = pose.gaitPhase;
    gait.current.amount = pose.gaitAmount;
    if (pose.seated) {
      shipGroup.localToWorld(rig.seat.set(...SEAT));
      avatarGroup.position.copy(rig.seat);
      avatarGroup.quaternion.copy(shipGroup.quaternion).multiply(rig.seatTurn);
    } else {
      avatarGroup.position.set(...pose.position);
      avatarGroup.rotation.set(pose.pitch, pose.yaw, pose.roll, "YXZ");
    }
    rig.velocity.set(...pose.velocity);

    // ---- Camera: orbit the avatar on keyed spherical coordinates, then
    // hand over to the cockpit eye riding inside the ship ----
    rig.target.copy(avatarGroup.position);
    if (firstFrame) {
      rig.focus.copy(rig.target);
      rig.focusVelocity.copy(rig.velocity);
    } else {
      smoothDamp(rig.focus, rig.target, rig.focusVelocity, 0.08, delta);
    }
    const lens = cameraRig(time);
    const level = Math.cos(lens.elevation);
    rig.eye
      .set(Math.sin(lens.azimuth) * level, Math.sin(lens.elevation), Math.cos(lens.azimuth) * level)
      .multiplyScalar(lens.distance)
      .add(rig.focus);
    rig.look.copy(rig.focus);
    rig.look.y += lens.aim;
    if (lens.cockpit > 0) {
      // A pilot's idle sway, so the parked view still breathes.
      shipGroup.localToWorld(
        rig.cockpitEye.set(
          COCKPIT_EYE[0] + Math.sin(time * 0.34) * 0.035,
          COCKPIT_EYE[1] + Math.sin(time * 0.46) * 0.018,
          COCKPIT_EYE[2],
        ),
      );
      shipGroup.localToWorld(
        rig.cockpitLook.set(
          COCKPIT_LOOK[0] + Math.sin(time * 0.22) * 0.06,
          COCKPIT_LOOK[1],
          COCKPIT_LOOK[2],
        ),
      );
      rig.eye.lerp(rig.cockpitEye, lens.cockpit);
      rig.look.lerp(rig.cockpitLook, lens.cockpit);
      // Arc up over the avatar's head on the way in, never through it.
      rig.eye.y += Math.sin(Math.PI * lens.cockpit) * 0.85;
    }
    camera.position.copy(rig.eye);
    camera.up.set(0, 1, 0);
    camera.lookAt(rig.look);
    camera.rotateZ(lens.roll);
    if (camera instanceof THREE.PerspectiveCamera && camera.fov !== lens.fov) {
      camera.fov = lens.fov;
      camera.updateProjectionMatrix();
    }

    // The camera becomes the pilot: dissolve the avatar as the lens nears its head.
    let fade = 1;
    if (pose.seated) {
      rig.head.set(0, 1.65, 0).applyQuaternion(avatarGroup.quaternion).add(avatarGroup.position);
      fade = smoothstep(1.2, 2.6, camera.position.distanceTo(rig.head));
    }
    if (fade !== avatarFade.current) {
      avatarFade.current = fade;
      avatarGroup.traverse((object) => {
        const material = (object as THREE.Mesh).material;
        if (material && !Array.isArray(material)) material.opacity = fade;
      });
    }
    avatarGroup.visible = fade > 0.02;

    // ---- Things that hang off the camera ----
    stars.current?.position.copy(camera.position).sub(COCKPIT_EYE_POINT).multiplyScalar(0.9);
    speedLines.update(camera.position, rig.velocity, delta);

    // ---- Planets drift in out of the haze as the ship settles ----
    const field = planetField.current;
    if (field) {
      const arrival = planetsArrived(time);
      field.visible = arrival > 0;
      field.position.z = lerp(-26, 0, arrival);
      field.scale.setScalar(lerp(0.55, 1, arrival));

      // One permanent light glides between planets: mounting a light per
      // selection would change the light count and recompile every shader.
      const light = selectionLight.current;
      const planetGroup = field.children[selectedIndex];
      if (light) {
        if (planetGroup) planetGroup.getWorldPosition(rig.lightTarget);
        if (light.intensity < 0.05) light.position.copy(rig.lightTarget);
        else light.position.lerp(rig.lightTarget, 1 - Math.exp(-delta * 9));
        light.color.lerp(rig.accent.set(accent), 1 - Math.exp(-delta * 8));
        light.intensity = THREE.MathUtils.damp(
          light.intensity,
          planetGroup && field.visible ? 5 * arrival : 0,
          8,
          delta,
        );
      }
    }
  });

  return (
    <>
      <color attach="background" args={["#030308"]} />
      <fog attach="fog" args={["#0a0614", 15, 40]} />
      <NebulaSky />
      <ambientLight intensity={0.38} color="#7460bb" />
      <hemisphereLight args={["#8197ff", "#170c25", 0.7]} />
      <directionalLight position={[4, 7, 6]} color="#d7f6ff" intensity={1.8} />
      <pointLight position={[-5, 2, -8]} color="#ff4dd8" intensity={11} distance={13} />
      <pointLight position={[5, -1, -10]} color="#54ffdc" intensity={10} distance={13} />
      <StarField fieldRef={stars} />
      <SpaceDust />
      <primitive object={speedLines.object} />

      <MoodboardLedge />
      <group ref={avatar} position={RUN_START_POINT}>
        <Avatar doc={profile.avatar} motion={avatarMotion} gait={gait} dissolve />
      </group>
      <Spaceship rootRef={ship} canopyLeftRef={canopyLeft} canopyRightRef={canopyRight} />
      <pointLight ref={selectionLight} intensity={0} distance={4.2} />

      <group ref={planetField} visible={skipIntro} scale={skipIntro ? 1 : 0.55}>
        {creators.map((creator, index) => (
          <Planet
            key={creator.id}
            creator={creator}
            position={PLANET_POSITIONS[index % PLANET_POSITIONS.length] as [number, number, number]}
            selected={creator.id === selectedId}
            onSelect={() => onSelect(creator.id)}
          />
        ))}
      </group>
    </>
  );
}

function reasonFor(creator: DiscoveryCreator, ownCrafts: string[], mode: DiscoveryMode): string {
  const shared = sharedCraftCount(ownCrafts, creator.profile.crafts);
  if (mode === "friends") return "already in your orbit";
  if (mode === "similar") return `${shared} shared practice${shared === 1 ? "" : "s"}`;
  if (mode === "opposite") return "outside your usual atmosphere";
  if (mode === "new") return "a fresh signal on ourspace";
  if (mode === "random") return "the universe picked this one";
  return creator.vibe;
}

export function DiscoveryPage({ resume = false }: { resume?: boolean }) {
  const profile = useApp((state) => state.profile);
  const setScreen = useNavigate();
  const mode = useApp((state) => state.discovery.mode);
  const query = useApp((state) => state.discovery.query);
  const randomSeed = useApp((state) => state.discovery.randomSeed);
  const selectedId = useApp((state) => state.discovery.selectedId);
  const updateDiscovery = useApp((state) => state.updateDiscovery);
  const [reducedMotion] = useState(
    () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false,
  );
  const skipSequence = resume || reducedMotion;
  const [phase, setPhase] = useState<FlightPhase>(skipSequence ? "arrived" : "depart");
  // The flight clock starts on the first rendered frame, which waits until every
  // shader is compiled, so the sequence never stalls mid-flight.
  const [warm, setWarm] = useState(false);
  const handleWarm = useCallback(() => setWarm(true), []);
  const setSelectedId = useCallback(
    (id: string) => updateDiscovery({ selectedId: id }),
    [updateDiscovery],
  );

  const creators = useMemo(() => {
    if (!profile) return [];
    let result = DISCOVERY_CREATORS.filter((creator) => {
      const shared = sharedCraftCount(profile.crafts, creator.profile.crafts);
      if (mode === "friends") return creator.relation === "friend";
      if (mode === "similar") return shared > 0;
      if (mode === "opposite") return shared === 0;
      if (mode === "new") return creator.relation === "new";
      return true;
    });
    const needle = query.trim().toLowerCase();
    if (needle) {
      result = result.filter((creator) =>
        [creator.profile.name, creator.profile.username, creator.vibe, ...creator.profile.crafts]
          .join(" ")
          .toLowerCase()
          .includes(needle),
      );
    }
    if (mode === "random") {
      result = [...result].sort(
        (a, b) =>
          seededOrder(`${a.id}:${profile.username}:${randomSeed}`) -
          seededOrder(`${b.id}:${profile.username}:${randomSeed}`),
      );
    }
    return result;
  }, [mode, profile, query, randomSeed]);

  useEffect(() => {
    if (creators.length && !creators.some((creator) => creator.id === selectedId)) {
      setSelectedId(creators[0]?.id ?? "");
    }
  }, [creators, selectedId, setSelectedId]);

  const selected = creators.find((creator) => creator.id === selectedId) ?? creators[0];
  const arrived = phase === "arrived";
  const avatarMotion: AvatarMotion =
    phase === "depart" || phase === "sprint"
      ? "run"
      : phase === "leap"
        ? "jump"
        : phase === "fall"
          ? "fall"
          : phase === "catch" || phase === "merge"
            ? "land"
            : "idle";
  const selectRelative = useCallback(
    (direction: -1 | 1) => {
      if (!creators.length) return;
      const current = Math.max(
        0,
        creators.findIndex((creator) => creator.id === selectedId),
      );
      const next = (current + direction + creators.length) % creators.length;
      setSelectedId(creators[next]?.id ?? "");
    },
    [creators, selectedId, setSelectedId],
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (
        !arrived ||
        (event.target instanceof HTMLElement && /input|textarea/i.test(event.target.tagName))
      )
        return;
      if (event.key === "Escape") setScreen({ name: "profile" });
      if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") selectRelative(1);
      if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") selectRelative(-1);
      if ((event.key === "Enter" || event.key === " ") && selected) {
        setScreen({ name: "visitor", profileId: selected.id });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [arrived, selectRelative, selected, setScreen]);

  if (!profile) return null;

  return (
    <main className={`discovery${arrived ? " arrived" : " in-flight"}${warm ? " warm" : ""}`}>
      <Canvas
        className="flight-canvas"
        frameloop={warm ? "always" : "never"}
        camera={{ fov: 47, near: 0.06, far: 80, position: [-0.85, 2.68, 7.75] }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.06;
        }}
      >
        <FlightScene
          profile={profile}
          skipIntro={skipSequence}
          avatarMotion={avatarMotion}
          creators={creators}
          selectedId={selected?.id ?? ""}
          onSelect={setSelectedId}
          onPhase={setPhase}
        />
        <Prewarm onReady={handleWarm} />
      </Canvas>

      <div className="discovery-ui">
        <div className="flight-cinematic-frame" aria-hidden="true">
          <i />
          <i />
          <span>OS // COURIER 01</span>
          <b>◇</b>
        </div>
        <header className="flight-status">
          <button
            type="button"
            className="flight-home"
            onClick={() => setScreen({ name: "profile" })}
          >
            our<span>space</span>★
          </button>
          <div>
            <span className="flight-pulse" />
            <b>
              {phase === "depart"
                ? "VECTOR LOCKED"
                : phase === "sprint"
                  ? "LEAVING PROFILE"
                  : phase === "leap"
                    ? "EDGE CLEARED"
                    : phase === "fall"
                      ? "GRAVITY ASSIST"
                      : phase === "catch"
                        ? "SHIP INTERCEPT"
                        : phase === "merge"
                          ? "ENTERING COCKPIT"
                          : "ORBIT STABLE"}
            </b>
          </div>
          <small>
            {arrived
              ? "A / D TO TUNE · ENTER TO VISIT · ESC HOME"
              : "ONE CONTINUOUS SIGNAL — HOLD TIGHT"}
          </small>
        </header>

        <aside className="discovery-filters" aria-label="Discovery filters">
          <div className="cockpit-panel-head">
            <span>FIND A MOOD</span>
            <b>{String(creators.length).padStart(2, "0")} SIGNALS</b>
          </div>
          <label className="discovery-search">
            <span>⌕</span>
            <input
              value={query}
              onChange={(event) => updateDiscovery({ query: event.target.value })}
              placeholder="name, craft, feeling…"
              aria-label="Search people"
            />
          </label>
          <div className="filter-grid">
            {MODES.map((item) => (
              <button
                type="button"
                key={item.id}
                className={mode === item.id ? "selected" : ""}
                onClick={() => {
                  updateDiscovery({
                    mode: item.id,
                    ...(item.id === "random" ? { randomSeed: randomSeed + 1 } : {}),
                  });
                }}
              >
                <b>{item.mark}</b>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </aside>

        {selected ? (
          <aside className="discovery-preview" aria-label={`Preview @${selected.profile.username}`}>
            <div className="cockpit-panel-head">
              <span>WORLD PREVIEW</span>
              <b>{selected.relation.toUpperCase()}</b>
            </div>
            <div className="preview-person">
              <div className="preview-avatar">
                <AvatarStage doc={selected.profile.avatar} turntable />
              </div>
              <div>
                <small>NOW TUNED TO</small>
                <h1>{selected.profile.name}</h1>
                <p>@{selected.profile.username}</p>
              </div>
            </div>
            <p className="preview-about">{selected.profile.about}</p>
            <div className="preview-vibe">
              <span>WHY THIS SIGNAL</span>
              <strong>{reasonFor(selected, profile.crafts, mode)}</strong>
            </div>
            <div className="preview-crafts">
              {selected.profile.crafts.map((craft) => (
                <span key={craft}>{CRAFTS.find((item) => item.id === craft)?.label ?? craft}</span>
              ))}
            </div>
            <div className="preview-signal">◎ {selected.signal}</div>
            <div className="preview-actions">
              <button
                type="button"
                className="planet-step"
                onClick={() => selectRelative(-1)}
                aria-label="Previous world"
              >
                ←
              </button>
              <button
                type="button"
                className="btn primary visit-world"
                onClick={() => setScreen({ name: "visitor", profileId: selected.id })}
              >
                Enter @{selected.profile.username} ↗
              </button>
              <button
                type="button"
                className="planet-step"
                onClick={() => selectRelative(1)}
                aria-label="Next world"
              >
                →
              </button>
            </div>
          </aside>
        ) : (
          <aside className="discovery-preview empty-signal">
            <strong>NO SIGNAL FOUND</strong>
            <p>Try a wider mood or clear your search.</p>
          </aside>
        )}

        <nav className="planet-dock" aria-label="People in this orbit">
          {creators.map((creator, index) => (
            <button
              type="button"
              key={creator.id}
              className={creator.id === selected?.id ? "selected" : ""}
              onClick={() => setSelectedId(creator.id)}
            >
              <i style={{ background: creator.planetAccent }} />
              <span>{String(index + 1).padStart(2, "0")}</span>
              <b>@{creator.profile.username}</b>
            </button>
          ))}
        </nav>
      </div>
    </main>
  );
}
