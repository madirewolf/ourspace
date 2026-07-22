import { useEffect, useMemo, useRef } from "react";
import { useFrame, type ThreeElements } from "@react-three/fiber";
import * as THREE from "three";
import type { AvatarDoc } from "@ourspace/core";

/**
 * A deterministic PS1-inspired person built entirely from primitives.
 * The taller proportions, angular joints, large boots, shaped clothes and
 * graphic hair read as a game character rather than a mascot.
 */
export type AvatarProps = ThreeElements["group"] & {
  doc: AvatarDoc;
  moving?: boolean;
  /** Raised hands and a rhythmic bounce for sound-room DJ booths. */
  performing?: boolean;
};

interface Materials {
  skin: THREE.MeshStandardMaterial;
  hair: THREE.MeshStandardMaterial;
  top: THREE.MeshStandardMaterial;
  bottom: THREE.MeshStandardMaterial;
  shoes: THREE.MeshStandardMaterial;
  eyes: THREE.MeshStandardMaterial;
  dark: THREE.MeshStandardMaterial;
  accent: THREE.MeshStandardMaterial;
  metal: THREE.MeshStandardMaterial;
}

function makeMaterials(doc: AvatarDoc): Materials {
  const flat = (color: string, extra?: Partial<THREE.MeshStandardMaterialParameters>) =>
    new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.82, ...extra });
  return {
    skin: flat(doc.skin),
    hair: flat(doc.hairColor),
    top: flat(doc.top),
    bottom: flat(doc.bottom),
    shoes: flat(doc.shoes),
    eyes: flat(doc.eyeColor, { roughness: 0.35 }),
    dark: flat("#111119", { roughness: 0.45 }),
    accent: flat("#ff4fd8", { roughness: 0.5 }),
    metal: flat("#9ca8b8", { metalness: 0.65, roughness: 0.32 }),
  };
}

function Hair({ style, m }: { style: string; m: Materials }) {
  switch (style) {
    case "buzz":
      return (
        <mesh material={m.hair} position={[0, 0.25, 0]}>
          <sphereGeometry args={[0.248, 7, 4, 0, Math.PI * 2, 0, 1.25]} />
        </mesh>
      );
    case "bowl":
      return (
        <group>
          <mesh material={m.hair} position={[0, 0.27, -0.005]}>
            <sphereGeometry args={[0.258, 7, 5, 0, Math.PI * 2, 0, 1.7]} />
          </mesh>
          <mesh material={m.hair} position={[0, 0.31, 0.218]} rotation={[0.22, 0, 0]}>
            <boxGeometry args={[0.38, 0.11, 0.055]} />
          </mesh>
        </group>
      );
    case "spiky": {
      const spikes: Array<[[number, number, number], [number, number, number], number]> = [
        [[0, 0.59, 0], [0, 0, 0], 0.11],
        [[0.17, 0.51, 0.02], [0, 0, -0.5], 0.1],
        [[-0.17, 0.51, 0.02], [0, 0, 0.5], 0.1],
        [[0.11, 0.51, -0.15], [0.55, 0, -0.3], 0.11],
        [[-0.11, 0.51, -0.15], [0.55, 0, 0.3], 0.11],
        [[0.2, 0.42, -0.1], [0.35, 0, -0.85], 0.09],
        [[-0.2, 0.42, -0.1], [0.35, 0, 0.85], 0.09],
      ];
      return (
        <group>
          <mesh material={m.hair} position={[0, 0.28, -0.01]}>
            <sphereGeometry args={[0.255, 7, 5, 0, Math.PI * 2, 0, 1.42]} />
          </mesh>
          {spikes.map(([position, rotation, radius], index) => (
            <mesh key={index} material={m.hair} position={position} rotation={rotation}>
              <coneGeometry args={[radius, 0.38, 4]} />
            </mesh>
          ))}
        </group>
      );
    }
    case "ponytail":
      return (
        <group>
          <mesh material={m.hair} position={[0, 0.27, -0.01]}>
            <sphereGeometry args={[0.255, 7, 5, 0, Math.PI * 2, 0, 1.48]} />
          </mesh>
          <mesh material={m.hair} position={[0, 0.33, -0.26]}>
            <octahedronGeometry args={[0.1, 0]} />
          </mesh>
          <mesh material={m.hair} position={[0, 0.06, -0.3]} rotation={[0.12, 0, 0]}>
            <coneGeometry args={[0.075, 0.5, 5]} />
          </mesh>
        </group>
      );
    case "buns":
      return (
        <group>
          <mesh material={m.hair} position={[0, 0.27, -0.01]}>
            <sphereGeometry args={[0.255, 7, 5, 0, Math.PI * 2, 0, 1.34]} />
          </mesh>
          <mesh material={m.hair} position={[0.2, 0.48, -0.02]}>
            <dodecahedronGeometry args={[0.13, 0]} />
          </mesh>
          <mesh material={m.hair} position={[-0.2, 0.48, -0.02]}>
            <dodecahedronGeometry args={[0.13, 0]} />
          </mesh>
        </group>
      );
    case "afro":
      return (
        <group position={[0, 0.31, -0.02]}>
          <mesh material={m.hair}>
            <dodecahedronGeometry args={[0.31, 1]} />
          </mesh>
          <mesh material={m.hair} position={[0.2, 0.05, 0]}>
            <dodecahedronGeometry args={[0.16, 0]} />
          </mesh>
          <mesh material={m.hair} position={[-0.2, 0.05, 0]}>
            <dodecahedronGeometry args={[0.16, 0]} />
          </mesh>
          <mesh material={m.hair} position={[0, 0.2, -0.04]}>
            <dodecahedronGeometry args={[0.17, 0]} />
          </mesh>
        </group>
      );
    case "long":
      return (
        <group>
          <mesh material={m.hair} position={[0, 0.23, -0.09]} scale={[1.04, 1.34, 0.9]}>
            <sphereGeometry args={[0.27, 7, 6]} />
          </mesh>
          <mesh material={m.hair} position={[0.18, 0.04, 0.05]} rotation={[0, 0, 0.05]}>
            <coneGeometry args={[0.07, 0.58, 5]} />
          </mesh>
          <mesh material={m.hair} position={[-0.18, 0.04, 0.05]} rotation={[0, 0, -0.05]}>
            <coneGeometry args={[0.07, 0.58, 5]} />
          </mesh>
        </group>
      );
    default:
      return null;
  }
}

function Accessory({ id, m }: { id: string; m: Materials }) {
  switch (id) {
    case "glasses":
      return (
        <group>
          <mesh material={m.dark} position={[0.083, 0.25, 0.223]}>
            <torusGeometry args={[0.067, 0.011, 4, 8]} />
          </mesh>
          <mesh material={m.dark} position={[-0.083, 0.25, 0.223]}>
            <torusGeometry args={[0.067, 0.011, 4, 8]} />
          </mesh>
          <mesh material={m.dark} position={[0, 0.25, 0.23]}>
            <boxGeometry args={[0.045, 0.012, 0.012]} />
          </mesh>
        </group>
      );
    case "shades":
      return (
        <mesh material={m.dark} position={[0, 0.25, 0.225]}>
          <boxGeometry args={[0.31, 0.075, 0.025]} />
        </mesh>
      );
    case "beret":
      return (
        <group rotation={[0, 0, 0.16]}>
          <mesh material={m.accent} position={[0, 0.48, 0]}>
            <cylinderGeometry args={[0.18, 0.25, 0.07, 6]} />
          </mesh>
          <mesh material={m.accent} position={[0, 0.54, 0]}>
            <octahedronGeometry args={[0.025, 0]} />
          </mesh>
        </group>
      );
    case "headphones":
      return (
        <group>
          <mesh material={m.dark} position={[0, 0.27, 0]}>
            <torusGeometry args={[0.25, 0.025, 4, 10, Math.PI]} />
          </mesh>
          <mesh material={m.accent} position={[0.24, 0.23, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.07, 0.07, 0.045, 6]} />
          </mesh>
          <mesh material={m.accent} position={[-0.24, 0.23, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.07, 0.07, 0.045, 6]} />
          </mesh>
        </group>
      );
    default:
      return null;
  }
}

export function Avatar({ doc, moving = false, performing = false, ...groupProps }: AvatarProps) {
  const materials = useMemo(() => makeMaterials(doc), [doc]);
  useEffect(
    () => () => Object.values(materials).forEach((material) => material.dispose()),
    [materials],
  );

  const body = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const armL = useRef<THREE.Group>(null);
  const armR = useRef<THREE.Group>(null);
  const legL = useRef<THREE.Group>(null);
  const legR = useRef<THREE.Group>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const swing = Math.sin(t * 9);
    const idle = Math.sin(t * 2);
    const performanceBeat = Math.sin(t * 5.5);
    const arm = performing ? -1.02 + performanceBeat * 0.18 : moving ? swing * 0.72 : idle * 0.045;
    const leg = moving ? swing * 0.58 : 0;
    if (armL.current) {
      armL.current.rotation.x = arm;
      armL.current.rotation.z = performing ? -0.18 : 0;
    }
    if (armR.current) {
      armR.current.rotation.x = performing ? arm - performanceBeat * 0.12 : -arm;
      armR.current.rotation.z = performing ? 0.18 : 0;
    }
    if (legL.current) legL.current.rotation.x = -leg;
    if (legR.current) legR.current.rotation.x = leg;
    if (body.current)
      body.current.position.y = performing
        ? Math.max(0, performanceBeat) * 0.035
        : moving
          ? Math.abs(swing) * 0.04
          : idle * 0.01;
    if (head.current) {
      head.current.rotation.z = performing ? performanceBeat * 0.055 : moving ? 0 : idle * 0.018;
      head.current.rotation.x = moving ? 0.035 : 0;
    }
  });

  return (
    <group {...groupProps}>
      <group ref={body}>
        <group ref={legL} position={[0.115, 0.7, 0]}>
          <mesh material={materials.bottom} position={[0, -0.19, 0]}>
            <cylinderGeometry args={[0.085, 0.07, 0.38, 5]} />
          </mesh>
          <mesh material={materials.bottom} position={[0, -0.47, 0]}>
            <cylinderGeometry args={[0.068, 0.055, 0.28, 5]} />
          </mesh>
          <mesh material={materials.shoes} position={[0, -0.65, 0.065]}>
            <boxGeometry args={[0.16, 0.12, 0.28]} />
          </mesh>
        </group>
        <group ref={legR} position={[-0.115, 0.7, 0]}>
          <mesh material={materials.bottom} position={[0, -0.19, 0]}>
            <cylinderGeometry args={[0.085, 0.07, 0.38, 5]} />
          </mesh>
          <mesh material={materials.bottom} position={[0, -0.47, 0]}>
            <cylinderGeometry args={[0.068, 0.055, 0.28, 5]} />
          </mesh>
          <mesh material={materials.shoes} position={[0, -0.65, 0.065]}>
            <boxGeometry args={[0.16, 0.12, 0.28]} />
          </mesh>
        </group>

        <mesh material={materials.top} position={[0, 1.02, 0]}>
          <cylinderGeometry args={[0.27, 0.2, 0.56, 6]} />
        </mesh>
        <mesh material={materials.dark} position={[0, 0.75, 0.01]}>
          <boxGeometry args={[0.42, 0.07, 0.25]} />
        </mesh>
        <mesh material={materials.metal} position={[0, 0.75, 0.145]}>
          <boxGeometry args={[0.09, 0.075, 0.025]} />
        </mesh>
        <mesh material={materials.top} position={[0.285, 1.23, 0]} rotation={[0, 0, -0.18]}>
          <octahedronGeometry args={[0.13, 0]} />
        </mesh>
        <mesh material={materials.top} position={[-0.285, 1.23, 0]} rotation={[0, 0, 0.18]}>
          <octahedronGeometry args={[0.13, 0]} />
        </mesh>

        <group ref={armL} position={[0.29, 1.23, 0]}>
          <mesh material={materials.top} position={[0, -0.23, 0]}>
            <cylinderGeometry args={[0.065, 0.05, 0.46, 5]} />
          </mesh>
          <mesh material={materials.skin} position={[0, -0.49, 0]}>
            <dodecahedronGeometry args={[0.072, 0]} />
          </mesh>
        </group>
        <group ref={armR} position={[-0.29, 1.23, 0]}>
          <mesh material={materials.top} position={[0, -0.23, 0]}>
            <cylinderGeometry args={[0.065, 0.05, 0.46, 5]} />
          </mesh>
          <mesh material={materials.skin} position={[0, -0.49, 0]}>
            <dodecahedronGeometry args={[0.072, 0]} />
          </mesh>
        </group>

        <mesh material={materials.skin} position={[0, 1.37, 0]}>
          <cylinderGeometry args={[0.085, 0.09, 0.15, 5]} />
        </mesh>
        <group ref={head} position={[0, 1.43, 0]}>
          <mesh material={materials.skin} position={[0, 0.22, 0]} scale={[0.9, 1.08, 0.88]}>
            <dodecahedronGeometry args={[0.245, 1]} />
          </mesh>
          <mesh material={materials.skin} position={[0, 0.2, 0.225]} rotation={[Math.PI / 4, 0, 0]}>
            <tetrahedronGeometry args={[0.045, 0]} />
          </mesh>
          <mesh
            material={materials.eyes}
            position={[0.082, 0.255, 0.214]}
            scale={[1.15, 0.72, 0.5]}
          >
            <sphereGeometry args={[0.032, 5, 3]} />
          </mesh>
          <mesh
            material={materials.eyes}
            position={[-0.082, 0.255, 0.214]}
            scale={[1.15, 0.72, 0.5]}
          >
            <sphereGeometry args={[0.032, 5, 3]} />
          </mesh>
          <mesh material={materials.hair} position={[0.083, 0.326, 0.205]} rotation={[0, 0, -0.12]}>
            <boxGeometry args={[0.085, 0.018, 0.016]} />
          </mesh>
          <mesh material={materials.hair} position={[-0.083, 0.326, 0.205]} rotation={[0, 0, 0.12]}>
            <boxGeometry args={[0.085, 0.018, 0.016]} />
          </mesh>
          <mesh material={materials.dark} position={[0, 0.125, 0.225]}>
            <boxGeometry args={[0.085, 0.018, 0.014]} />
          </mesh>
          <Hair style={doc.hairStyle} m={materials} />
          <Accessory id={doc.accessory} m={materials} />
        </group>
      </group>
    </group>
  );
}
