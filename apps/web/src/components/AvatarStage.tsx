import { useEffect, useRef, type ReactNode } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import type { Group } from "three";
import { Avatar } from "@ourspace/avatar";
import type { AvatarDoc } from "@ourspace/core";

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
  const group = useRef<Group>(null);
  useFrame((_, delta) => {
    if (enabled && group.current) {
      group.current.rotation.y += delta * 0.6;
    }
  });
  return <group ref={group}>{children}</group>;
}

export interface AvatarStageProps {
  doc: AvatarDoc;
  turntable?: boolean;
  /** Camera distance — smaller is closer (portrait) framing. */
  zoom?: "full" | "bust";
}

/** A little pedestal stage for previewing an avatar. Transparent background. */
export function AvatarStage({ doc, turntable = false, zoom = "full" }: AvatarStageProps) {
  const camera =
    zoom === "bust"
      ? { fov: 26, position: [0, 1.58, 2.2] as [number, number, number] }
      : { fov: 29, position: [0, 1.25, 4.35] as [number, number, number] };

  return (
    <Canvas camera={camera} dpr={[1, 1.35]} gl={{ alpha: true, antialias: false }}>
      <AimCamera y={zoom === "bust" ? 1.56 : 0.94} />
      <ambientLight intensity={0.62} color="#8ea4ff" />
      <directionalLight position={[3, 5, 4]} intensity={2.4} color="#f5f1ff" />
      <directionalLight position={[-4, 2, -3]} intensity={1.1} color="#d83bff" />
      <Turntable enabled={turntable}>
        <Avatar doc={doc} />
        <mesh position={[0, -0.05, 0]}>
          <cylinderGeometry args={[0.85, 0.95, 0.1, 10]} />
          <meshStandardMaterial
            color="#151522"
            emissive="#39185f"
            emissiveIntensity={0.25}
            flatShading
            roughness={0.8}
          />
        </mesh>
      </Turntable>
    </Canvas>
  );
}
