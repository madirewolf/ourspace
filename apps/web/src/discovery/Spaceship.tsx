import { useMemo, type RefObject } from "react";
import * as THREE from "three";
import { glowTexture } from "../components/glowTexture";

interface SpaceshipProps {
  rootRef: RefObject<THREE.Group | null>;
  canopyLeftRef: RefObject<THREE.Group | null>;
  canopyRightRef: RefObject<THREE.Group | null>;
}

function Wing({ side }: { side: -1 | 1 }) {
  const shape = useMemo(() => {
    const value = new THREE.Shape();
    value.moveTo(0.55, -1.35);
    value.lineTo(3.45, -0.25);
    value.lineTo(3.05, 1.05);
    value.lineTo(0.45, 0.58);
    value.closePath();
    return value;
  }, []);

  return (
    <mesh position={[0, -0.24, 0.35]} rotation={[Math.PI / 2, 0, 0]} scale={[side, 1, 1]}>
      <extrudeGeometry args={[shape, { depth: 0.14, bevelEnabled: false, steps: 1 }]} />
      <meshStandardMaterial
        color="#3d365d"
        emissive="#321d55"
        emissiveIntensity={0.18}
        metalness={0.58}
        roughness={0.38}
        flatShading
      />
    </mesh>
  );
}

function ConsoleLights() {
  const colors = ["#54ffdc", "#ff4dd8", "#c8ff32", "#65a7ff"];
  return (
    <>
      {Array.from({ length: 10 }, (_, index) => {
        const row = Math.floor(index / 5);
        const column = index % 5;
        return (
          <mesh
            key={index}
            position={[-1.04 + column * 0.52, 0.93 - row * 0.11, 1.14 + row * 0.13]}
            rotation={[-0.28, 0, 0]}
          >
            <boxGeometry args={[0.25, 0.025, 0.1]} />
            <meshBasicMaterial color={colors[index % colors.length]} toneMapped={false} />
          </mesh>
        );
      })}
    </>
  );
}

function EngineExhaust({ color }: { color: string }) {
  const glow = glowTexture();
  return (
    <group position={[0, 0, 1.92]}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.47, 0.47, 0.2, 8, 1, true]} />
        <meshStandardMaterial
          color="#2a2f40"
          metalness={0.8}
          roughness={0.3}
          flatShading
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh position={[0, 0, 0.02]}>
        <circleGeometry args={[0.36, 8]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0, 0.04]}>
        <circleGeometry args={[0.17, 8]} />
        <meshBasicMaterial color="#f4fffd" toneMapped={false} />
      </mesh>
      <sprite position={[0, 0, 0.3]} scale={[2.1, 2.1, 1]}>
        <spriteMaterial
          map={glow}
          color={color}
          transparent
          opacity={0.85}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </sprite>
      <sprite position={[0, 0, 0.9]} scale={[1.1, 1.1, 1]}>
        <spriteMaterial
          map={glow}
          color="#ffffff"
          transparent
          opacity={0.45}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </sprite>
    </group>
  );
}

/** Twin canted tail fins: the entry camera glides between them, never through. */
function TailFin({ side }: { side: -1 | 1 }) {
  const glow = glowTexture();
  return (
    <group position={[side * 1.0, 0.5, 3.45]} rotation={[-0.24, 0, -side * 0.38]}>
      <mesh position={[0, 0.62, 0]}>
        <boxGeometry args={[0.12, 1.3, 1.15]} />
        <meshStandardMaterial
          color="#4a4269"
          emissive="#24163f"
          emissiveIntensity={0.3}
          metalness={0.62}
          roughness={0.38}
          flatShading
        />
      </mesh>
      <mesh position={[0, 0.62, 0.6]}>
        <boxGeometry args={[0.13, 1.18, 0.06]} />
        <meshBasicMaterial color={side === -1 ? "#54ffdc" : "#ff4dd8"} toneMapped={false} />
      </mesh>
      <mesh position={[0, 1.33, -0.3]} rotation={[0, 0, Math.PI / 4]}>
        <octahedronGeometry args={[0.1, 0]} />
        <meshBasicMaterial color="#c8ff32" toneMapped={false} />
      </mesh>
      <sprite position={[0, 1.33, -0.3]} scale={[0.7, 0.7, 1]}>
        <spriteMaterial
          map={glow}
          color="#c8ff32"
          transparent
          opacity={0.7}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </sprite>
    </group>
  );
}

/**
 * Gull-wing roof panel hinged at the top of the cockpit pillar. Open, it lifts
 * clear of the entry path; closed, it becomes a glass roof above the pilot, so
 * nothing frames across the planets.
 */
function CanopyPanel({ side }: { side: -1 | 1 }) {
  const inward = -side;
  return (
    <>
      <mesh position={[inward * 0.8, 0, 0.55]}>
        <boxGeometry args={[1.6, 0.045, 2.85]} />
        <meshStandardMaterial
          color="#587897"
          emissive="#153451"
          emissiveIntensity={0.18}
          metalness={0.08}
          roughness={0.08}
          transparent
          opacity={0.2}
          depthWrite={false}
        />
      </mesh>
      <mesh position={[inward * 0.8, 0.06, -0.86]}>
        <boxGeometry args={[1.6, 0.07, 0.1]} />
        <meshStandardMaterial color="#555b70" metalness={0.78} roughness={0.24} />
      </mesh>
      <mesh position={[inward * 0.8, 0.06, 1.96]}>
        <boxGeometry args={[1.6, 0.07, 0.1]} />
        <meshStandardMaterial color="#555b70" metalness={0.78} roughness={0.24} />
      </mesh>
    </>
  );
}

/**
 * Runtime-built courier craft: broad PS2-era silhouette outside, readable
 * cockpit framing inside. The camera enters between the twin fins and under the
 * raised gull-wing canopy, so no hull mesh needs to pop out of existence during
 * the POV handoff.
 */
export function Spaceship({ rootRef, canopyLeftRef, canopyRightRef }: SpaceshipProps) {
  return (
    <group ref={rootRef}>
      <pointLight position={[0, 3.2, 4.1]} color="#9fc5ff" intensity={8} distance={11} />
      <pointLight position={[0, 1.5, -2.2]} color="#ff4dd8" intensity={4.5} distance={8} />
      <group name="exterior-hull">
        <mesh position={[0, -0.08, 0.25]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[1.16, 0.52, 6.6, 8, 2, true]} />
          <meshStandardMaterial
            color="#252839"
            emissive="#111525"
            emissiveIntensity={0.22}
            metalness={0.7}
            roughness={0.3}
            flatShading
          />
        </mesh>
        <mesh position={[0, -0.72, 0.35]}>
          <boxGeometry args={[1.35, 0.34, 5.25]} />
          <meshStandardMaterial color="#11131d" metalness={0.68} roughness={0.34} flatShading />
        </mesh>
        <mesh position={[0, -0.05, -3.2]} scale={[0.62, 0.48, 1.05]}>
          <icosahedronGeometry args={[0.78, 1]} />
          <meshStandardMaterial
            color="#4f4772"
            emissive="#311a57"
            emissiveIntensity={0.24}
            metalness={0.62}
            roughness={0.34}
            flatShading
          />
        </mesh>
        <Wing side={-1} />
        <Wing side={1} />

        {([-1, 1] as const).map((side) => (
          <group key={side} position={[side * 1.52, -0.42, 1.05]}>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.43, 0.52, 3.7, 8, 1]} />
              <meshStandardMaterial
                color="#161925"
                emissive={side === -1 ? "#122f35" : "#32132c"}
                emissiveIntensity={0.34}
                metalness={0.76}
                roughness={0.27}
                flatShading
              />
            </mesh>
            <EngineExhaust color={side === -1 ? "#54ffdc" : "#ff4dd8"} />
            <pointLight
              position={[0, 0, 2.12]}
              color={side === -1 ? "#54ffdc" : "#ff4dd8"}
              intensity={5}
              distance={4.5}
            />
          </group>
        ))}

        {([-1, 1] as const).map((side) => (
          <TailFin key={side} side={side} />
        ))}
      </group>

      <group name="cockpit-interior">
        <pointLight position={[0, 2.05, 2.35]} color="#54ffdc" intensity={3.5} distance={5} />
        <mesh position={[0, 0.66, 1.02]} rotation={[-0.28, 0, 0]}>
          <boxGeometry args={[3.35, 0.24, 1.42]} />
          <meshStandardMaterial color="#0b0d15" metalness={0.62} roughness={0.28} flatShading />
        </mesh>
        <mesh position={[0, 0.8, 0.78]} rotation={[-0.28, 0, 0]}>
          <boxGeometry args={[2.7, 0.045, 0.86]} />
          <meshStandardMaterial
            color="#171b28"
            emissive="#14253a"
            emissiveIntensity={0.45}
            metalness={0.48}
            roughness={0.32}
            flatShading
          />
        </mesh>
        <ConsoleLights />

        {([-1, 1] as const).map((side) => (
          <group key={side}>
            <mesh position={[side * 1.67, 0.68, 1.75]} rotation={[-0.12, 0, side * 0.08]}>
              <boxGeometry args={[0.48, 0.38, 2.8]} />
              <meshStandardMaterial color="#11141f" metalness={0.64} roughness={0.31} flatShading />
            </mesh>
            <mesh position={[side * 1.64, 1.75, -0.18]} rotation={[0.08, 0, side * -0.19]}>
              <boxGeometry args={[0.14, 2.25, 0.16]} />
              <meshStandardMaterial color="#4b4f62" metalness={0.78} roughness={0.25} />
            </mesh>
          </group>
        ))}
        <mesh position={[0, 2.72, -0.42]}>
          <boxGeometry args={[3.15, 0.14, 0.18]} />
          <meshStandardMaterial color="#4b4f62" metalness={0.78} roughness={0.25} />
        </mesh>

        <group position={[0, 1.2, 1.63]} rotation={[Math.PI / 2, 0, 0]}>
          <mesh>
            <torusGeometry args={[0.32, 0.045, 5, 10]} />
            <meshStandardMaterial color="#7b8298" metalness={0.86} roughness={0.2} flatShading />
          </mesh>
          <mesh position={[0, 0, 0.2]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.045, 0.06, 0.42, 6]} />
            <meshStandardMaterial color="#303445" metalness={0.8} roughness={0.22} />
          </mesh>
        </group>

        <group position={[0, 0.3, 3.45]}>
          <mesh position={[0, 0.5, 0.18]} rotation={[-0.1, 0, 0]}>
            <boxGeometry args={[0.86, 0.95, 0.3]} />
            <meshStandardMaterial color="#1b1d2b" metalness={0.4} roughness={0.64} flatShading />
          </mesh>
          <mesh position={[0, 1.1, 0.26]} rotation={[-0.1, 0, 0]}>
            <boxGeometry args={[0.52, 0.24, 0.24]} />
            <meshStandardMaterial color="#2b3042" metalness={0.45} roughness={0.5} flatShading />
          </mesh>
          <mesh position={[0, 0.06, -0.12]}>
            <boxGeometry args={[0.82, 0.14, 0.62]} />
            <meshStandardMaterial color="#1b1d2b" metalness={0.4} roughness={0.64} flatShading />
          </mesh>
        </group>

        <group ref={canopyLeftRef} position={[-1.58, 2.72, 0.45]}>
          <CanopyPanel side={-1} />
        </group>
        <group ref={canopyRightRef} position={[1.58, 2.72, 0.45]}>
          <CanopyPanel side={1} />
        </group>

        <mesh position={[0, 1.18, 0.18]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.47, 0.018, 4, 24]} />
          <meshBasicMaterial color="#54ffdc" transparent opacity={0.42} toneMapped={false} />
        </mesh>
        <mesh position={[0, 1.18, 0.18]} rotation={[0, 0, Math.PI / 4]}>
          <planeGeometry args={[0.55, 0.55]} />
          <meshBasicMaterial
            color="#54ffdc"
            wireframe
            transparent
            opacity={0.2}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      </group>
    </group>
  );
}
