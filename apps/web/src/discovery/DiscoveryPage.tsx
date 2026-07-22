import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Avatar } from "@ourspace/avatar";
import { CRAFTS, lerp, smoothstep, type ProfileDoc } from "@ourspace/core";
import { AvatarStage } from "../components/AvatarStage";
import { useApp, type DiscoveryMode } from "../store";
import { DISCOVERY_CREATORS, sharedCraftCount, type DiscoveryCreator } from "./catalog";

type FlightPhase = "run" | "drop" | "dock" | "arrived";

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
  const points = useMemo(() => {
    const values = new Float32Array(220 * 3);
    for (let index = 0; index < 220; index++) {
      const a = Math.sin(index * 12.9898) * 43758.5453;
      const b = Math.sin(index * 78.233 + 4.1) * 24634.6345;
      const c = Math.sin(index * 39.425 + 9.7) * 13579.2468;
      values[index * 3] = (a - Math.floor(a) - 0.5) * 34;
      values[index * 3 + 1] = (b - Math.floor(b) - 0.5) * 20;
      values[index * 3 + 2] = -4 - (c - Math.floor(c)) * 28;
    }
    return values;
  }, []);

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[points, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#d8efff" size={0.045} sizeAttenuation transparent opacity={0.85} />
    </points>
  );
}

function MoodboardLedge() {
  return (
    <group position={[0, 0.1, 1.25]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <boxGeometry args={[6.8, 4.5, 0.16]} />
        <meshStandardMaterial color="#11121b" emissive="#2a1342" emissiveIntensity={0.35} />
      </mesh>
      {[-2.2, 0, 2.2].map((x, index) => (
        <mesh
          key={x}
          position={[x, 0.11, 0]}
          rotation={[-Math.PI / 2, 0, index % 2 ? -0.06 : 0.06]}
        >
          <planeGeometry args={[1.75, 2.65]} />
          <meshStandardMaterial
            color={["#6f35d8", "#0c8f88", "#ca4d18"][index]}
            emissive={["#ff55ca", "#54ffdc", "#ffbd39"][index]}
            emissiveIntensity={0.18}
            roughness={0.82}
          />
        </mesh>
      ))}
      <mesh position={[0, -0.05, -2.28]}>
        <boxGeometry args={[7, 0.24, 0.22]} />
        <meshStandardMaterial color="#54ffdc" emissive="#54ffdc" emissiveIntensity={1.4} />
      </mesh>
    </group>
  );
}

function Spaceship({
  shipRef,
  exteriorRef,
}: {
  shipRef: React.RefObject<THREE.Group | null>;
  exteriorRef: React.RefObject<THREE.Group | null>;
}) {
  return (
    <group ref={shipRef}>
      <group ref={exteriorRef}>
        <mesh position={[0, 0.25, 0.4]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[1.65, 4.6, 6]} />
          <meshStandardMaterial color="#242637" metalness={0.72} roughness={0.3} flatShading />
        </mesh>
        <mesh position={[-2.15, 0, 0.8]} rotation={[0.12, 0, -0.18]}>
          <boxGeometry args={[2.9, 0.15, 1.55]} />
          <meshStandardMaterial color="#3a315a" metalness={0.55} roughness={0.4} />
        </mesh>
        <mesh position={[2.15, 0, 0.8]} rotation={[0.12, 0, 0.18]}>
          <boxGeometry args={[2.9, 0.15, 1.55]} />
          <meshStandardMaterial color="#3a315a" metalness={0.55} roughness={0.4} />
        </mesh>
        <mesh position={[0, -0.15, 2.35]}>
          <cylinderGeometry args={[0.78, 0.92, 0.3, 8]} />
          <meshStandardMaterial color="#090a12" emissive="#c8ff32" emissiveIntensity={1.3} />
        </mesh>
      </group>

      {/* Cockpit elements remain visible when the camera moves inside. */}
      <mesh position={[0, 0.56, 2.35]} rotation={[-0.28, 0, 0]}>
        <boxGeometry args={[4.4, 0.18, 1.05]} />
        <meshStandardMaterial color="#11131d" metalness={0.7} roughness={0.28} />
      </mesh>
      <mesh position={[-2.15, 1.43, 1.3]} rotation={[0, 0, -0.17]}>
        <boxGeometry args={[0.15, 2.4, 0.15]} />
        <meshStandardMaterial color="#343747" metalness={0.8} />
      </mesh>
      <mesh position={[2.15, 1.43, 1.3]} rotation={[0, 0, 0.17]}>
        <boxGeometry args={[0.15, 2.4, 0.15]} />
        <meshStandardMaterial color="#343747" metalness={0.8} />
      </mesh>
      <mesh position={[0, 2.45, 0.72]}>
        <boxGeometry args={[4.05, 0.13, 0.14]} />
        <meshStandardMaterial color="#343747" metalness={0.8} />
      </mesh>
      {[-1.4, -0.85, -0.3, 0.3, 0.85, 1.4].map((x, index) => (
        <mesh key={x} position={[x, 0.72, 1.98]} rotation={[-0.28, 0, 0]}>
          <boxGeometry args={[0.34, 0.035, 0.2]} />
          <meshBasicMaterial
            color={index % 3 === 0 ? "#ff4dd8" : index % 3 === 1 ? "#54ffdc" : "#c8ff32"}
            toneMapped={false}
          />
        </mesh>
      ))}
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
  creators,
  selectedId,
  onSelect,
  onPhase,
}: {
  profile: ProfileDoc;
  skipIntro: boolean;
  creators: DiscoveryCreator[];
  selectedId: string;
  onSelect: (id: string) => void;
  onPhase: (phase: FlightPhase) => void;
}) {
  const avatar = useRef<THREE.Group>(null);
  const deck = useRef<THREE.Group>(null);
  const ship = useRef<THREE.Group>(null);
  const shipExterior = useRef<THREE.Group>(null);
  const start = useRef<number | null>(null);
  const lastPhase = useRef<FlightPhase | null>(null);
  const lookAt = useMemo(() => new THREE.Vector3(), []);

  useFrame((state) => {
    if (start.current === null) start.current = state.clock.elapsedTime;
    const elapsed = skipIntro ? 99 : state.clock.elapsedTime - start.current;
    const avatarGroup = avatar.current;
    const shipGroup = ship.current;
    const exteriorGroup = shipExterior.current;
    const deckGroup = deck.current;
    const camera = state.camera;

    let phase: FlightPhase;
    if (elapsed < 2.35) phase = "run";
    else if (elapsed < 4.7) phase = "drop";
    else if (elapsed < 7.4) phase = "dock";
    else phase = "arrived";
    if (phase !== lastPhase.current) {
      lastPhase.current = phase;
      onPhase(phase);
    }

    if (!avatarGroup || !shipGroup || !deckGroup || !exteriorGroup) return;

    if (phase === "run") {
      const progress = smoothstep(0, 2.35, elapsed);
      avatarGroup.visible = true;
      avatarGroup.position.set(
        lerp(-2.4, 2.55, progress),
        0.2 + Math.sin(progress * Math.PI) * 0.12,
        0.4,
      );
      avatarGroup.rotation.set(0, Math.PI / 2, 0);
      deckGroup.position.y = 0;
      shipGroup.position.y = -5.2;
      exteriorGroup.visible = true;
      camera.position.set(lerp(-0.7, 0.55, progress), 2.5, lerp(7.2, 5.9, progress));
      lookAt.set(avatarGroup.position.x * 0.24, 0.9, 0.1);
      camera.lookAt(lookAt);
    } else if (phase === "drop") {
      const progress = smoothstep(2.35, 4.7, elapsed);
      avatarGroup.visible = true;
      avatarGroup.position.set(
        2.55 - progress * 1.6,
        lerp(0.2, -4.1, progress * progress),
        lerp(0.4, 0, progress),
      );
      avatarGroup.rotation.set(progress * 1.6, Math.PI / 2 + progress * 2.2, progress * 0.45);
      deckGroup.position.y = lerp(0, 4.5, progress);
      shipGroup.position.y = -5.2;
      exteriorGroup.visible = true;
      camera.position.set(
        lerp(0.55, 0.15, progress),
        lerp(2.5, -1.2, progress),
        lerp(5.9, 6.7, progress),
      );
      lookAt.copy(avatarGroup.position);
      camera.lookAt(lookAt);
    } else if (phase === "dock") {
      const progress = smoothstep(4.7, 7.4, elapsed);
      avatarGroup.visible = progress < 0.22;
      avatarGroup.position.y = -4.1;
      deckGroup.position.y = 4.5;
      shipGroup.position.y = lerp(-5.2, 0, progress);
      exteriorGroup.visible = progress < 0.78;
      camera.position.set(0, lerp(-1.2, 1.48, progress), lerp(6.7, 4.75, progress));
      lookAt.set(0, lerp(-3.8, 0.8, progress), lerp(0, -8.5, progress));
      camera.lookAt(lookAt);
    } else {
      avatarGroup.visible = false;
      deckGroup.position.y = 4.5;
      shipGroup.position.y = 0;
      exteriorGroup.visible = false;
      const time = state.clock.elapsedTime;
      camera.position.set(
        Math.sin(time * 0.35) * 0.045,
        1.48 + Math.sin(time * 0.48) * 0.025,
        4.75,
      );
      lookAt.set(0, 0.55, -10.2);
      camera.lookAt(lookAt);
    }
  });

  return (
    <>
      <color attach="background" args={["#030308"]} />
      <fog attach="fog" args={["#080510", 14, 34]} />
      <ambientLight intensity={0.32} color="#7460bb" />
      <directionalLight position={[4, 7, 6]} color="#d7f6ff" intensity={1.65} />
      <pointLight position={[-5, 2, -8]} color="#ff4dd8" intensity={11} distance={13} />
      <pointLight position={[5, -1, -10]} color="#54ffdc" intensity={10} distance={13} />
      <StarField />

      <group ref={deck}>
        <MoodboardLedge />
      </group>
      <group ref={avatar} position={[-2.4, 0.2, 0.4]}>
        <Avatar doc={profile.avatar} moving />
      </group>
      <Spaceship shipRef={ship} exteriorRef={shipExterior} />

      <group>
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
  const [phase, setPhase] = useState<FlightPhase>(resume ? "arrived" : "run");
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
        camera={{ fov: 48, position: [0, 2.5, 7.2] }}
        dpr={[1, 1.45]}
        gl={{ antialias: false }}
      >
        <FlightScene
          profile={profile}
          skipIntro={resume}
          creators={creators}
          selectedId={selected?.id ?? ""}
          onSelect={setSelectedId}
          onPhase={setPhase}
        />
      </Canvas>

      <div className="discovery-ui">
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
              {phase === "run"
                ? "LEAVING PROFILE"
                : phase === "drop"
                  ? "GRAVITY ASSIST"
                  : phase === "dock"
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
