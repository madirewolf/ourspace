import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Avatar, type AvatarMotion } from "@ourspace/avatar";
import { CRAFTS, lerp, smoothstep, type ProfileDoc } from "@ourspace/core";
import { AvatarStage } from "../components/AvatarStage";
import { useApp, type DiscoveryMode } from "../store";
import { DISCOVERY_CREATORS, sharedCraftCount, type DiscoveryCreator } from "./catalog";
import { Spaceship } from "./Spaceship";

type FlightPhase = "depart" | "sprint" | "leap" | "fall" | "catch" | "merge" | "arrived";

const ENTRY_HOLD = 0.72;
const RUN_END = 2.65;
const LEAP_END = 3.5;
const FALL_END = 5.85;
const CATCH_END = 7.2;
const MERGE_END = 9.85;

function segment(time: number, start: number, end: number): number {
  return smoothstep(start, end, time);
}

function phaseAt(time: number): FlightPhase {
  if (time < 0.38) return "depart";
  if (time < RUN_END) return "sprint";
  if (time < LEAP_END) return "leap";
  if (time < FALL_END) return "fall";
  if (time < CATCH_END) return "catch";
  if (time < MERGE_END) return "merge";
  return "arrived";
}

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

function StarField() {
  const field = useRef<THREE.Points>(null);
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
    if (!field.current) return;
    field.current.rotation.z += delta * 0.003;
    field.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.07) * 0.018;
  });

  return (
    <points ref={field}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[points, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#d8efff" size={0.052} sizeAttenuation transparent opacity={0.88} />
    </points>
  );
}

function SpeedLines({
  groupRef,
  materialRef,
}: {
  groupRef: React.RefObject<THREE.Group | null>;
  materialRef: React.RefObject<THREE.LineBasicMaterial | null>;
}) {
  const lines = useMemo(() => {
    const values = new Float32Array(72 * 6);
    for (let index = 0; index < 72; index++) {
      const a = Math.sin(index * 91.73) * 31821.771;
      const b = Math.sin(index * 37.19 + 2.7) * 18731.227;
      const x = (a - Math.floor(a) - 0.5) * 12;
      const y = (b - Math.floor(b) - 0.5) * 8;
      const z = -1.2 - (index % 12) * 0.72;
      const offset = index * 6;
      values[offset] = x;
      values[offset + 1] = y;
      values[offset + 2] = z;
      values[offset + 3] = x * 1.02;
      values[offset + 4] = y * 1.02;
      values[offset + 5] = z - 0.75 - (index % 4) * 0.32;
    }
    return values;
  }, []);

  return (
    <group ref={groupRef}>
      <lineSegments>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[lines, 3]} />
        </bufferGeometry>
        <lineBasicMaterial
          ref={materialRef}
          color="#a8f8ff"
          transparent
          opacity={0}
          depthWrite={false}
          toneMapped={false}
        />
      </lineSegments>
    </group>
  );
}

function MoodboardLedge() {
  return (
    <group position={[0, 0.1, 1.25]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <boxGeometry args={[6.8, 4.5, 0.16]} />
        <meshStandardMaterial color="#11121b" emissive="#2a1342" emissiveIntensity={0.35} />
      </mesh>
      {[-2.55, -0.85, 0.85, 2.55].map((x, index) => (
        <mesh
          key={x}
          position={[x, 0.11, 0]}
          rotation={[-Math.PI / 2, 0, index % 2 ? -0.06 : 0.06]}
        >
          <planeGeometry args={[1.42, 2.68]} />
          <meshStandardMaterial
            color={["#6f35d8", "#0c8f88", "#ca4d18", "#3158a1"][index]}
            emissive={["#ff55ca", "#54ffdc", "#ffbd39", "#65a7ff"][index]}
            emissiveIntensity={0.18}
            roughness={0.82}
          />
        </mesh>
      ))}
      <mesh position={[3.46, 0.08, 0]}>
        <boxGeometry args={[0.16, 0.22, 4.7]} />
        <meshStandardMaterial color="#54ffdc" emissive="#54ffdc" emissiveIntensity={1.4} />
      </mesh>
      {[-2.75, -1.2, 0.4, 1.95].map((x, index) => (
        <mesh key={x} position={[x, 0.26, -1.65]} rotation={[0, 0, index % 2 ? 0.15 : -0.1]}>
          <boxGeometry args={[0.82, 0.38, 0.06]} />
          <meshStandardMaterial
            color={index % 2 ? "#c8ff32" : "#ff4dd8"}
            emissive={index % 2 ? "#708f18" : "#7d1f69"}
            emissiveIntensity={0.35}
            flatShading
          />
        </mesh>
      ))}
      <pointLight position={[3.2, 1.1, 0]} color="#54ffdc" intensity={5} distance={5} />
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
      {selected && <pointLight color={creator.planetAccent} intensity={5} distance={4.2} />}
    </group>
  );
}

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
  const deck = useRef<THREE.Group>(null);
  const ship = useRef<THREE.Group>(null);
  const canopyLeft = useRef<THREE.Group>(null);
  const canopyRight = useRef<THREE.Group>(null);
  const speedLines = useRef<THREE.Group>(null);
  const speedMaterial = useRef<THREE.LineBasicMaterial>(null);
  const planetField = useRef<THREE.Group>(null);
  const start = useRef<number | null>(null);
  const lastPhase = useRef<FlightPhase | null>(null);
  const currentLook = useMemo(() => new THREE.Vector3(0, 0.9, 0), []);
  const desiredPosition = useMemo(() => new THREE.Vector3(), []);
  const desiredLook = useMemo(() => new THREE.Vector3(), []);
  const cameraOffset = useMemo(() => new THREE.Vector3(), []);

  useFrame((state, delta) => {
    if (start.current === null) start.current = state.clock.elapsedTime;
    const elapsed = skipIntro
      ? MERGE_END + 1
      : Math.max(0, state.clock.elapsedTime - start.current - ENTRY_HOLD);
    const avatarGroup = avatar.current;
    const shipGroup = ship.current;
    const deckGroup = deck.current;
    const camera = state.camera;
    const phase = phaseAt(elapsed);
    if (phase !== lastPhase.current) {
      lastPhase.current = phase;
      onPhase(phase);
    }

    if (!avatarGroup || !shipGroup || !deckGroup || !canopyLeft.current || !canopyRight.current)
      return;

    let shipY = -10;
    if (elapsed >= 4.1 && elapsed < FALL_END) {
      shipY = lerp(-10, -5.6, segment(elapsed, 4.1, FALL_END));
    } else if (elapsed >= FALL_END && elapsed < CATCH_END) {
      shipY = lerp(-5.6, -2.5, segment(elapsed, FALL_END, CATCH_END));
    } else if (elapsed >= CATCH_END && elapsed < MERGE_END) {
      shipY = lerp(-2.5, 0, segment(elapsed, CATCH_END, MERGE_END));
    } else if (elapsed >= MERGE_END) {
      shipY = 0;
    }
    shipGroup.position.set(0, shipY, 0);
    shipGroup.rotation.x =
      elapsed < FALL_END ? lerp(-0.08, 0.02, segment(elapsed, 4.1, FALL_END)) : 0;
    shipGroup.rotation.z =
      elapsed < CATCH_END
        ? Math.sin(segment(elapsed, 4.1, CATCH_END) * Math.PI) * -0.075
        : THREE.MathUtils.damp(shipGroup.rotation.z, 0, 5, delta);

    const canopyClose = segment(elapsed, CATCH_END + 0.2, MERGE_END - 0.35);
    canopyLeft.current.rotation.z = lerp(-0.92, 0, canopyClose);
    canopyRight.current.rotation.z = lerp(0.92, 0, canopyClose);

    const deckExit = segment(elapsed, LEAP_END - 0.15, FALL_END - 0.2);
    deckGroup.position.set(0, lerp(0, 8.5, deckExit), lerp(0, 2.6, deckExit));
    deckGroup.rotation.z = deckExit * -0.08;

    if (planetField.current) {
      const reveal = segment(elapsed, MERGE_END - 1.25, MERGE_END);
      planetField.current.visible = reveal > 0.005;
      planetField.current.scale.setScalar(Math.max(0.001, reveal));
      planetField.current.position.z = lerp(-7, 0, reveal);
    }

    if (phase === "depart" || phase === "sprint") {
      const progress = segment(elapsed, 0.22, RUN_END);
      avatarGroup.visible = true;
      avatarGroup.scale.setScalar(1);
      avatarGroup.position.set(lerp(-3.25, 2.82, progress), 0.2, 0.35);
      avatarGroup.rotation.set(0, Math.PI / 2, 0);
    } else if (phase === "leap") {
      const progress = segment(elapsed, RUN_END, LEAP_END);
      avatarGroup.visible = true;
      avatarGroup.scale.setScalar(1);
      avatarGroup.position.set(
        lerp(2.82, 3.55, progress),
        0.2 + Math.sin(progress * Math.PI) * 0.82 - progress * progress * 0.3,
        lerp(0.35, 0.25, progress),
      );
      avatarGroup.rotation.set(0.04, Math.PI / 2, -Math.sin(progress * Math.PI) * 0.24);
    } else if (phase === "fall") {
      const progress = segment(elapsed, LEAP_END, FALL_END);
      avatarGroup.visible = true;
      avatarGroup.scale.setScalar(1);
      avatarGroup.position.set(
        lerp(3.55, 0, progress),
        lerp(-0.1, -5.25, progress * progress),
        lerp(0.25, 3.08, progress),
      );
      avatarGroup.rotation.set(
        lerp(0.04, 0.18, progress),
        lerp(Math.PI / 2, Math.PI, progress),
        Math.sin(progress * Math.PI) * 0.16,
      );
    } else if (phase === "catch" || phase === "merge") {
      const mergeProgress = segment(elapsed, CATCH_END, MERGE_END);
      avatarGroup.visible = phase === "catch" || mergeProgress < 0.54;
      avatarGroup.scale.setScalar(1);
      avatarGroup.position.set(0, shipY + 0.35, 3.08);
      avatarGroup.rotation.set(0, Math.PI, 0);
    } else {
      avatarGroup.visible = false;
    }

    let targetFov = 48;
    let roll = 0;
    if (phase === "depart" || phase === "sprint") {
      const progress = segment(elapsed, 0, RUN_END);
      desiredPosition.set(
        lerp(-0.85, 1.46, progress),
        lerp(2.68, 2.18, progress),
        lerp(7.75, 6.15, progress),
      );
      desiredLook.set(lerp(-1.2, 2.65, progress), lerp(0.88, 0.72, progress), 0.3);
      targetFov = lerp(47, 51, progress);
      roll = Math.sin(progress * Math.PI) * -0.018;
    } else if (phase === "leap") {
      const progress = segment(elapsed, RUN_END, LEAP_END);
      desiredPosition
        .copy(avatarGroup.position)
        .add(cameraOffset.set(lerp(-1.18, -0.92, progress), lerp(1.65, 1.45, progress), 5.62));
      desiredLook.copy(avatarGroup.position).add(cameraOffset.set(0, 0.72, 0));
      targetFov = lerp(51, 57, progress);
      roll = lerp(-0.018, -0.055, progress);
    } else if (phase === "fall") {
      const progress = segment(elapsed, LEAP_END, FALL_END);
      desiredPosition
        .copy(avatarGroup.position)
        .add(cameraOffset.set(lerp(-0.92, 0.72, progress), lerp(1.45, 0.72, progress), 5.45));
      desiredLook.copy(avatarGroup.position).add(cameraOffset.set(0, 0.62, 0));
      targetFov = 57 + Math.sin(progress * Math.PI) * 5;
      roll = lerp(-0.055, 0.035, progress);
    } else if (phase === "catch") {
      const progress = segment(elapsed, FALL_END, CATCH_END);
      desiredPosition.set(
        lerp(0.72, 0, progress),
        shipY + lerp(1.08, 2.28, progress),
        lerp(8.48, 6.35, progress),
      );
      desiredLook.copy(avatarGroup.position).add(cameraOffset.set(0, 0.9, 0));
      targetFov = lerp(58, 52, progress);
      roll = Math.sin(progress * Math.PI) * 0.045;
    } else if (phase === "merge") {
      const progress = segment(elapsed, CATCH_END, MERGE_END);
      desiredPosition.set(0, shipY + lerp(2.28, 1.7, progress), lerp(6.35, 2.86, progress));
      const forwardBlend = segment(progress, 0.38, 0.82);
      desiredLook.set(0, lerp(shipY + 1.92, 0.72, forwardBlend), lerp(3.0, -10.2, forwardBlend));
      targetFov = lerp(52, 48, progress);
      roll = Math.sin(progress * Math.PI * 2) * 0.018 * (1 - progress);
    } else {
      const time = state.clock.elapsedTime;
      desiredPosition.set(Math.sin(time * 0.34) * 0.035, 1.7 + Math.sin(time * 0.46) * 0.018, 2.86);
      desiredLook.set(Math.sin(time * 0.22) * 0.03, 0.72, -10.2);
    }

    const cameraEase = 1 - Math.exp(-delta * (phase === "arrived" ? 4.2 : 8.5));
    camera.position.lerp(desiredPosition, cameraEase);
    currentLook.lerp(desiredLook, 1 - Math.exp(-delta * 7.5));
    camera.up.set(0, 1, 0);
    camera.lookAt(currentLook);
    camera.rotateZ(roll);
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = THREE.MathUtils.damp(camera.fov, targetFov, 7, delta);
      camera.updateProjectionMatrix();
    }

    if (speedLines.current && speedMaterial.current) {
      speedLines.current.position.copy(camera.position);
      speedLines.current.quaternion.copy(camera.quaternion);
      speedLines.current.translateZ((state.clock.elapsedTime * 7.5) % 1.15);
      const speedTarget =
        phase === "fall"
          ? Math.sin(segment(elapsed, LEAP_END, FALL_END) * Math.PI) * 0.6
          : phase === "catch"
            ? 0.24 * (1 - segment(elapsed, FALL_END, CATCH_END))
            : 0;
      speedMaterial.current.opacity = THREE.MathUtils.damp(
        speedMaterial.current.opacity,
        speedTarget,
        7,
        delta,
      );
    }
  });

  return (
    <>
      <color attach="background" args={["#030308"]} />
      <fog attach="fog" args={["#080510", 15, 38]} />
      <ambientLight intensity={0.38} color="#7460bb" />
      <hemisphereLight args={["#8197ff", "#170c25", 0.7]} />
      <directionalLight position={[4, 7, 6]} color="#d7f6ff" intensity={1.8} />
      <pointLight position={[-5, 2, -8]} color="#ff4dd8" intensity={11} distance={13} />
      <pointLight position={[5, -1, -10]} color="#54ffdc" intensity={10} distance={13} />
      <StarField />
      <SpeedLines groupRef={speedLines} materialRef={speedMaterial} />

      <group ref={deck}>
        <MoodboardLedge />
      </group>
      <group ref={avatar} position={[-3.25, 0.2, 0.35]}>
        <Avatar doc={profile.avatar} motion={avatarMotion} />
      </group>
      <Spaceship rootRef={ship} canopyLeftRef={canopyLeft} canopyRightRef={canopyRight} />

      <group ref={planetField} visible={skipIntro} scale={skipIntro ? 1 : 0.001}>
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
  const setScreen = useApp((state) => state.setScreen);
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
    <main className={`discovery${arrived ? " arrived" : " in-flight"}`}>
      <Canvas
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
