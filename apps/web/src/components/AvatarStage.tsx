import { useEffect, useRef, type ReactNode } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import type { Group } from "three";
import { Avatar } from "@atrium/avatar";
import type { AvatarDoc } from "@atrium/core";

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
      ? { fov: 28, position: [0, 1.3, 2.3] as [number, number, number] }
      : { fov: 30, position: [0, 1.2, 4.0] as [number, number, number] };

  return (
    <Canvas camera={camera} dpr={[1, 1.5]} gl={{ alpha: true, antialias: true }}>
      <AimCamera y={zoom === "bust" ? 1.2 : 0.78} />
      <ambientLight intensity={0.85} color="#fff6e8" />
      <directionalLight position={[3, 5, 4]} intensity={2.1} color="#fff2dd" />
      <directionalLight position={[-4, 2, -3]} intensity={0.7} color="#bcd0ff" />
      <Turntable enabled={turntable}>
        <Avatar doc={doc} />
        <mesh position={[0, -0.05, 0]}>
          <cylinderGeometry args={[0.85, 0.95, 0.1, 10]} />
          <meshStandardMaterial color="#e4dcc9" flatShading roughness={0.9} />
        </mesh>
      </Turntable>
    </Canvas>
  );
}
