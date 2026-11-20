import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { Avatar } from "@ourspace/avatar";
import type { AvatarDoc } from "@ourspace/core";
import { Prewarm } from "./Prewarm";
import { glowTexture } from "./glowTexture";

/** Aim the default camera at the avatar's middle, whatever the box aspect. */
function AimCamera({ y }: { y: number }) {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  useEffect(() => {
    camera.lookAt(0, y, 0);
  }, [camera, y, size]);
  return null;
}

function Turntable({ enabled, children }: { enabled: boolean; children: ReactNode }) {
  const group = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (enabled && group.current) {
      group.current.rotation.y += delta * 0.6;
    }
  });
  return <group ref={group}>{children}</group>;
}

/** Low-poly plinth: faceted base, a lit rim line and a soft contact shadow. */
function Pedestal() {
  const shadow = useMemo(() => glowTexture(), []);
  return (
    <group>
      <mesh position={[0, -0.06, 0]}>
        <cylinderGeometry args={[0.86, 0.96, 0.12, 10]} />
        <meshStandardMaterial
          color="#1a1626"
          emissive="#3a1d63"
          emissiveIntensity={0.3}
          flatShading
          roughness={0.78}
        />
      </mesh>
      <mesh position={[0, 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.78, 0.84, 10, 1]} />
        <meshBasicMaterial color="#a77bff" transparent opacity={0.55} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.004, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={1}>
        <planeGeometry args={[1.25, 1.25]} />
        <meshBasicMaterial
          color="#05030a"
          map={shadow}
          transparent
          opacity={0.7}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

export interface AvatarStageProps {
  doc: AvatarDoc;
  turntable?: boolean;
  /** Camera distance — smaller is closer (portrait) framing. */
  zoom?: "full" | "bust";
}

/**
 * A little pedestal stage for previewing an avatar. Transparent background.
 * The canvas stays hidden until every shader is compiled, then fades in, so a
 * stage never pops in half-lit or stalls the page around it.
 */
export function AvatarStage({ doc, turntable = false, zoom = "full" }: AvatarStageProps) {
  const [warm, setWarm] = useState(false);
  const handleWarm = useCallback(() => setWarm(true), []);
  const camera =
    zoom === "bust"
      ? { fov: 26, position: [0, 1.58, 2.2] as [number, number, number] }
      : { fov: 29, position: [0, 1.32, 5.05] as [number, number, number] };

  return (
    <Canvas
      camera={camera}
      dpr={[1, 1.5]}
      frameloop={warm ? "always" : "never"}
      gl={{ alpha: true, antialias: true }}
      style={{ opacity: warm ? 1 : 0, transition: "opacity 420ms ease-out" }}
    >
      <AimCamera y={zoom === "bust" ? 1.56 : 0.9} />
      {/* Warm studio key, soft violet bounce from below, magenta rim behind. */}
      <hemisphereLight args={["#fff1e4", "#2d1846", 0.85]} />
      <directionalLight position={[2.6, 4.2, 4]} intensity={2.3} color="#ffe6cf" />
      <directionalLight position={[-3.4, 1.4, 2.6]} intensity={0.45} color="#9fd8ff" />
      <directionalLight position={[-3, 2.6, -3.4]} intensity={1.5} color="#d23cff" />
      <Turntable enabled={turntable}>
        <Avatar doc={doc} />
        <Pedestal />
      </Turntable>
      <Prewarm onReady={handleWarm} />
    </Canvas>
  );
}
