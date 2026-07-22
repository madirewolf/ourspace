import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useCallback } from "react";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { Avatar } from "@ourspace/avatar";
import type { MusicModule, ProfileDoc } from "@ourspace/core";
import { useApp, type Screen } from "../store";

const FLOOR_TILES = Array.from({ length: 81 }, (_, index) => ({
  x: (index % 9) - 4,
  z: Math.floor(index / 9) - 2.5,
  phase: (index * 0.73) % Math.PI,
}));

function Equalizer() {
  const bars = useRef<Array<THREE.Mesh | null>>([]);
  useFrame((state) => {
    const time = state.clock.elapsedTime;
    bars.current.forEach((bar, index) => {
      if (!bar) return;
      const height = 0.5 + (Math.sin(time * (3.4 + (index % 3)) + index * 0.8) + 1) * 0.52;
      bar.scale.y = height;
      bar.position.y = 1.1 + height * 0.25;
    });
  });
  return (
    <group position={[0, 0, -3.42]}>
      {Array.from({ length: 13 }, (_, index) => (
        <mesh
          key={index}
          ref={(node) => {
            bars.current[index] = node;
          }}
          position={[(index - 6) * 0.29, 1.3, 0]}
        >
          <boxGeometry args={[0.18, 0.5, 0.1]} />
          <meshStandardMaterial
            color={index % 2 === 0 ? "#4dffcf" : "#ff3fd1"}
            emissive={index % 2 === 0 ? "#10d7a8" : "#d412a7"}
            emissiveIntensity={2.2}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
}

function MovingRig() {
  const rig = useRef<THREE.Group>(null);
  const orb = useRef<THREE.Mesh>(null);
  useFrame((state, delta) => {
    const time = state.clock.elapsedTime;
    if (rig.current) rig.current.rotation.y += delta * 0.32;
    if (orb.current) {
      orb.current.position.y = 4.3 + Math.sin(time * 1.8) * 0.13;
      orb.current.rotation.y += delta * 0.45;
    }
  });
  return (
    <>
      <group ref={rig} position={[0, 4.3, -0.7]}>
        {[0, 1, 2, 3].map((index) => (
          <group key={index} rotation={[0, (index * Math.PI) / 2, 0]}>
            <spotLight
              position={[0, 0, 0]}
              color={index % 2 === 0 ? "#ff36d1" : "#2bffcf"}
              intensity={20}
              angle={0.2}
              penumbra={0.5}
              distance={12}
            />
          </group>
        ))}
      </group>
      <mesh ref={orb} position={[0, 4.3, -0.7]}>
        <icosahedronGeometry args={[0.42, 1]} />
        <meshStandardMaterial
          color="#d9e5ff"
          emissive="#8d63ff"
          emissiveIntensity={1.6}
          metalness={0.92}
          roughness={0.15}
          flatShading
        />
      </mesh>
    </>
  );
}

function RaveScene({ module, profile }: { module: MusicModule; profile: ProfileDoc }) {
  const accent = profile.avatar.top;
  const tiles = useMemo(() => FLOOR_TILES, []);

  return (
    <>
      <color attach="background" args={["#05040b"]} />
      <fog attach="fog" args={["#090514", 8, 19]} />
      <ambientLight intensity={0.32} color="#552b9b" />
      <hemisphereLight args={["#8a5cff", "#05040b", 0.42]} />
      <pointLight position={[-4, 2.6, 1]} color="#ff32c9" intensity={18} distance={10} />
      <pointLight position={[4, 2.4, -1]} color="#25ffd0" intensity={18} distance={10} />
      <MovingRig />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.04, 1.45]}>
        <planeGeometry args={[12, 15]} />
        <meshStandardMaterial color="#090912" roughness={0.72} metalness={0.18} />
      </mesh>
      {tiles.map((tile, index) => (
        <mesh
          key={index}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[tile.x * 1.05, 0, tile.z * 1.05 + 1.4]}
        >
          <planeGeometry args={[0.91, 0.91]} />
          <meshStandardMaterial
            color={(index + Math.floor(index / 9)) % 2 === 0 ? "#12131e" : "#0d0b18"}
            emissive={index % 5 === 0 ? "#35145a" : "#071a1a"}
            emissiveIntensity={0.72 + tile.phase * 0.08}
            roughness={0.55}
          />
        </mesh>
      ))}

      <mesh position={[0, 0.52, -2.25]}>
        <boxGeometry args={[4.2, 1.05, 1.15]} />
        <meshStandardMaterial
          color="#10101a"
          emissive={accent}
          emissiveIntensity={0.12}
          metalness={0.6}
          roughness={0.35}
        />
      </mesh>
      <mesh position={[0, 0.61, -1.65]}>
        <planeGeometry args={[3.45, 0.38]} />
        <meshBasicMaterial color="#090914" />
      </mesh>
      <Equalizer />

      {[-2.75, 2.75].map((x) => (
        <group key={x} position={[x, 0.95, -2.72]}>
          <mesh>
            <boxGeometry args={[1, 1.9, 0.75]} />
            <meshStandardMaterial color="#09090f" roughness={0.6} />
          </mesh>
          <mesh position={[0, 0.38, 0.39]}>
            <torusGeometry args={[0.27, 0.08, 5, 10]} />
            <meshStandardMaterial color="#222438" emissive="#ff2fc7" emissiveIntensity={1.4} />
          </mesh>
          <mesh position={[0, -0.38, 0.39]}>
            <torusGeometry args={[0.34, 0.09, 5, 10]} />
            <meshStandardMaterial color="#222438" emissive="#2bffd1" emissiveIntensity={1.25} />
          </mesh>
        </group>
      ))}

      <group position={[0, 0.75, -2.88]}>
        <Avatar doc={profile.avatar} performing />
      </group>
      <mesh position={[-0.7, 1.13, -1.64]} rotation={[-Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.34, 0.34, 0.035, 12]} />
        <meshStandardMaterial
          color="#11131d"
          emissive="#ff35c9"
          emissiveIntensity={0.45}
          metalness={0.7}
        />
      </mesh>
      <mesh position={[0.7, 1.13, -1.64]} rotation={[-Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.34, 0.34, 0.035, 12]} />
        <meshStandardMaterial
          color="#11131d"
          emissive="#23ffd0"
          emissiveIntensity={0.45}
          metalness={0.7}
        />
      </mesh>

      <mesh position={[0, 2.45, -3.48]}>
        <planeGeometry args={[6.8, 1.2]} />
        <meshStandardMaterial color="#080812" emissive="#30104e" emissiveIntensity={0.8} />
      </mesh>
      <group position={[0, 2.45, -3.4]}>
        {module.title
          .slice(0, 12)
          .toUpperCase()
          .split("")
          .map((character, index, characters) => (
            <mesh
              key={`${character}-${index}`}
              position={[(index - (characters.length - 1) / 2) * 0.3, 0, 0]}
            >
              <boxGeometry args={[0.19, 0.42, 0.05]} />
              <meshBasicMaterial
                color={index % 2 ? "#ff3dcc" : "#49ffd4"}
                transparent
                opacity={character === " " ? 0 : 0.9}
                toneMapped={false}
              />
            </mesh>
          ))}
      </group>

      <OrbitControls
        target={[0, 1.15, -1.5]}
        enablePan={false}
        minDistance={4.2}
        maxDistance={10}
        minPolarAngle={0.82}
        maxPolarAngle={1.48}
        autoRotate
        autoRotateSpeed={0.32}
      />
    </>
  );
}

export function RavePage({
  moduleId,
  profileOverride,
  returnScreen,
}: {
  moduleId: string;
  profileOverride?: ProfileDoc;
  returnScreen?: Screen;
}) {
  const localProfile = useApp((s) => s.profile);
  const setScreen = useApp((s) => s.setScreen);
  const profile = profileOverride ?? localProfile;
  const goBack = useCallback(
    () => setScreen(returnScreen ?? { name: "profile" }),
    [returnScreen, setScreen],
  );
  const module = profile?.modules.find(
    (item): item is MusicModule => item.id === moduleId && item.kind === "music",
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") goBack();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goBack]);

  const missing = !profile || !module;
  useEffect(() => {
    if (missing) goBack();
  }, [goBack, missing]);
  if (missing) return null;

  const orderedTracks = [...module.tracks].sort((a, b) =>
    a.id === module.favoriteTrackId ? -1 : b.id === module.favoriteTrackId ? 1 : 0,
  );

  return (
    <main className="rave">
      <Canvas
        camera={{ fov: 46, position: [0, 3.2, 7.4] }}
        dpr={[1, 1.5]}
        gl={{ antialias: false }}
      >
        <RaveScene module={module} profile={profile} />
      </Canvas>
      <div className="rave-ui">
        <button type="button" className="btn small rave-back" onClick={goBack}>
          ← Exit room
        </button>
        <div className="rave-now">
          <span>LIVE FROM @{profile.username}</span>
          <strong>{module.title}</strong>
          <small>drag to look around // scroll to zoom // esc to leave</small>
        </div>
        <section className="rave-playlist" aria-label={`${module.title} playlist`}>
          <div className="rave-playlist-head">
            <span>QUEUE.DAT</span>
            <b>{String(module.tracks.length).padStart(2, "0")} TRACKS</b>
          </div>
          {orderedTracks.length ? (
            orderedTracks.slice(0, 5).map((track, index) => (
              <div
                className={`rave-track${track.id === module.favoriteTrackId ? " favorite" : ""}`}
                key={track.id}
              >
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong>{track.title}</strong>
                {track.src ? (
                  <audio
                    src={track.src}
                    controls
                    preload="metadata"
                    autoPlay={track.id === module.favoriteTrackId}
                    loop={track.id === module.favoriteTrackId}
                  />
                ) : (
                  <small>signal unavailable</small>
                )}
              </div>
            ))
          ) : (
            <p>THE BOOTH IS WAITING FOR A TRACK.</p>
          )}
        </section>
      </div>
    </main>
  );
}
