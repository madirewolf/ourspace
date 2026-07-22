import { useEffect, useMemo, useRef } from "react";
import { useFrame, type ThreeElements } from "@react-three/fiber";
import * as THREE from "three";
import type { AvatarDoc } from "@atrium/core";

/**
 * The whole person, built from primitives at runtime — no modeled assets.
 * Proportions are Mii-ish (the head is ~40% of the height), shading is flat,
 * segment counts are low on purpose: PS2-era craft (CLAUDE.md principle 6).
 *
 * Feet rest at y=0; total height ≈ 1.7 units.
 */

export type AvatarProps = ThreeElements["group"] & {
  doc: AvatarDoc;
  /** Swing limbs in a walk cycle instead of the idle sway. */
  moving?: boolean;
};

interface Materials {
  skin: THREE.MeshStandardMaterial;
  hair: THREE.MeshStandardMaterial;
  top: THREE.MeshStandardMaterial;
  bottom: THREE.MeshStandardMaterial;
  shoes: THREE.MeshStandardMaterial;
  eyes: THREE.MeshStandardMaterial;
  dark: THREE.MeshStandardMaterial;
  blush: THREE.MeshStandardMaterial;
  accent: THREE.MeshStandardMaterial;
}

function makeMaterials(doc: AvatarDoc): Materials {
  const flat = (color: string, extra?: Partial<THREE.MeshStandardMaterialParameters>) =>
    new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.85, ...extra });
  return {
    skin: flat(doc.skin),
    hair: flat(doc.hairColor),
    top: flat(doc.top),
    bottom: flat(doc.bottom),
    shoes: flat(doc.shoes),
    eyes: flat(doc.eyeColor, { roughness: 0.4 }),
    dark: flat("#26221c", { roughness: 0.5 }),
    blush: flat("#f2a5a0", { transparent: true, opacity: 0.55 }),
    accent: flat("#b5443a"),
  };
}

function Hair({ style, m }: { style: string; m: Materials }) {
  switch (style) {
    case "buzz":
      return (
        <mesh material={m.hair} position={[0, 0.34, 0]}>
          <sphereGeometry args={[0.345, 8, 6, 0, Math.PI * 2, 0, 1.35]} />
        </mesh>
      );
    case "bowl":
      return (
        <mesh material={m.hair} position={[0, 0.34, 0]}>
          <sphereGeometry args={[0.35, 8, 6, 0, Math.PI * 2, 0, 1.85]} />
        </mesh>
      );
    case "spiky":
      return (
        <group>
          <mesh material={m.hair} position={[0, 0.34, 0]}>
            <sphereGeometry args={[0.345, 8, 6, 0, Math.PI * 2, 0, 1.3]} />
          </mesh>
          <mesh material={m.hair} position={[0, 0.72, 0]}>
            <coneGeometry args={[0.06, 0.2, 5]} />
          </mesh>
          <mesh material={m.hair} position={[0.15, 0.66, 0.06]} rotation={[0, 0, -0.5]}>
            <coneGeometry args={[0.06, 0.18, 5]} />
          </mesh>
          <mesh material={m.hair} position={[-0.15, 0.66, 0.06]} rotation={[0, 0, 0.5]}>
            <coneGeometry args={[0.06, 0.18, 5]} />
          </mesh>
          <mesh material={m.hair} position={[0.08, 0.68, -0.14]} rotation={[0.45, 0, -0.25]}>
            <coneGeometry args={[0.06, 0.18, 5]} />
          </mesh>
          <mesh material={m.hair} position={[-0.08, 0.68, -0.14]} rotation={[0.45, 0, 0.25]}>
            <coneGeometry args={[0.06, 0.18, 5]} />
          </mesh>
        </group>
      );
    case "ponytail":
      return (
        <group>
          <mesh material={m.hair} position={[0, 0.34, 0]}>
            <sphereGeometry args={[0.35, 8, 6, 0, Math.PI * 2, 0, 1.6]} />
          </mesh>
          <mesh material={m.hair} position={[0, 0.5, -0.3]}>
            <sphereGeometry args={[0.115, 6, 4]} />
          </mesh>
          <mesh material={m.hair} position={[0, 0.26, -0.36]} rotation={[2.9, 0, 0]}>
            <coneGeometry args={[0.05, 0.34, 5]} />
          </mesh>
        </group>
      );
    case "buns":
      return (
        <group>
          <mesh material={m.hair} position={[0, 0.34, 0]}>
            <sphereGeometry args={[0.345, 8, 6, 0, Math.PI * 2, 0, 1.35]} />
          </mesh>
          <mesh material={m.hair} position={[0.24, 0.6, -0.02]}>
            <sphereGeometry args={[0.105, 6, 4]} />
          </mesh>
          <mesh material={m.hair} position={[-0.24, 0.6, -0.02]}>
            <sphereGeometry args={[0.105, 6, 4]} />
          </mesh>
        </group>
      );
    case "afro":
      return (
        <mesh material={m.hair} position={[0, 0.44, -0.01]}>
          <sphereGeometry args={[0.46, 7, 5]} />
        </mesh>
      );
    case "long":
      return (
        <mesh material={m.hair} position={[0, 0.34, 0]} scale={[1, 1.15, 1]}>
          <sphereGeometry args={[0.36, 8, 6, 0, Math.PI * 2, 0, 2.5]} />
        </mesh>
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
          <mesh material={m.dark} position={[0.115, 0.4, 0.305]}>
            <torusGeometry args={[0.088, 0.013, 5, 12]} />
          </mesh>
          <mesh material={m.dark} position={[-0.115, 0.4, 0.305]}>
            <torusGeometry args={[0.088, 0.013, 5, 12]} />
          </mesh>
          <mesh material={m.dark} position={[0, 0.4, 0.315]}>
            <boxGeometry args={[0.07, 0.015, 0.015]} />
          </mesh>
        </group>
      );
    case "shades":
      return (
        <mesh material={m.dark} position={[0, 0.4, 0.305]}>
          <boxGeometry args={[0.31, 0.085, 0.03]} />
        </mesh>
      );
    case "beret":
      return (
        <group rotation={[0, 0, 0.14]}>
          <mesh material={m.accent} position={[0, 0.64, 0]}>
            <cylinderGeometry args={[0.24, 0.33, 0.09, 8]} />
          </mesh>
          <mesh material={m.accent} position={[0, 0.7, 0]}>
            <sphereGeometry args={[0.028, 5, 4]} />
          </mesh>
        </group>
      );
    case "headphones":
      return (
        <group>
          <mesh material={m.dark} position={[0, 0.34, 0]}>
            <torusGeometry args={[0.37, 0.032, 5, 12, Math.PI]} />
          </mesh>
          <mesh material={m.dark} position={[0.36, 0.34, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.085, 0.085, 0.055, 8]} />
          </mesh>
          <mesh material={m.dark} position={[-0.36, 0.34, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.085, 0.085, 0.055, 8]} />
          </mesh>
        </group>
      );
    default:
      return null;
  }
}

export function Avatar({ doc, moving = false, ...groupProps }: AvatarProps) {
  const m = useMemo(() => makeMaterials(doc), [doc]);
  useEffect(
    () => () => {
      for (const mat of Object.values(m)) {
        mat.dispose();
      }
    },
    [m],
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
    const arm = moving ? swing * 0.7 : idle * 0.06;
    const leg = moving ? swing * 0.6 : 0;
    if (armL.current) armL.current.rotation.x = arm;
    if (armR.current) armR.current.rotation.x = -arm;
    if (legL.current) legL.current.rotation.x = -leg;
    if (legR.current) legR.current.rotation.x = leg;
    if (body.current) {
      body.current.position.y = moving ? Math.abs(swing) * 0.05 : idle * 0.015;
    }
    if (head.current) {
      head.current.rotation.z = moving ? 0 : idle * 0.03;
      head.current.rotation.x = moving ? 0.06 : 0;
    }
  });

  return (
    <group {...groupProps}>
      <group ref={body}>
        {/* legs */}
        <group ref={legL} position={[0.09, 0.58, 0]}>
          <mesh material={m.bottom} position={[0, -0.21, 0]}>
            <cylinderGeometry args={[0.07, 0.06, 0.42, 5]} />
          </mesh>
          <mesh material={m.shoes} position={[0, -0.545, 0.03]}>
            <boxGeometry args={[0.11, 0.08, 0.18]} />
          </mesh>
        </group>
        <group ref={legR} position={[-0.09, 0.58, 0]}>
          <mesh material={m.bottom} position={[0, -0.21, 0]}>
            <cylinderGeometry args={[0.07, 0.06, 0.42, 5]} />
          </mesh>
          <mesh material={m.shoes} position={[0, -0.545, 0.03]}>
            <boxGeometry args={[0.11, 0.08, 0.18]} />
          </mesh>
        </group>

        {/* torso */}
        <mesh material={m.top} position={[0, 0.82, 0]}>
          <cylinderGeometry args={[0.16, 0.215, 0.46, 7]} />
        </mesh>

        {/* arms */}
        <group ref={armL} position={[0.225, 1.0, 0]}>
          <mesh material={m.top} position={[0, -0.15, 0]} rotation={[0, 0, -0.08]}>
            <cylinderGeometry args={[0.05, 0.052, 0.3, 5]} />
          </mesh>
          <mesh material={m.skin} position={[0.02, -0.33, 0]}>
            <sphereGeometry args={[0.058, 6, 4]} />
          </mesh>
        </group>
        <group ref={armR} position={[-0.225, 1.0, 0]}>
          <mesh material={m.top} position={[0, -0.15, 0]} rotation={[0, 0, 0.08]}>
            <cylinderGeometry args={[0.05, 0.052, 0.3, 5]} />
          </mesh>
          <mesh material={m.skin} position={[-0.02, -0.33, 0]}>
            <sphereGeometry args={[0.058, 6, 4]} />
          </mesh>
        </group>

        {/* head */}
        <group ref={head} position={[0, 1.02, 0]}>
          <mesh material={m.skin} position={[0, 0.34, 0]}>
            <sphereGeometry args={[0.34, 8, 6]} />
          </mesh>

          {/* eyes */}
          <mesh material={m.eyes} position={[0.115, 0.4, 0.3]} scale={[1, 1, 0.55]}>
            <sphereGeometry args={[0.042, 6, 4]} />
          </mesh>
          <mesh material={m.eyes} position={[-0.115, 0.4, 0.3]} scale={[1, 1, 0.55]}>
            <sphereGeometry args={[0.042, 6, 4]} />
          </mesh>

          {/* brows */}
          <mesh material={m.hair} position={[0.115, 0.52, 0.285]} rotation={[0, 0, -0.1]}>
            <boxGeometry args={[0.1, 0.025, 0.02]} />
          </mesh>
          <mesh material={m.hair} position={[-0.115, 0.52, 0.285]} rotation={[0, 0, 0.1]}>
            <boxGeometry args={[0.1, 0.025, 0.02]} />
          </mesh>

          {/* smile: an arc centered on the bottom of its circle */}
          <mesh material={m.dark} position={[0, 0.2, 0.305]} rotation={[-0.15, 0, 3.61]}>
            <torusGeometry args={[0.1, 0.014, 5, 10, 2.2]} />
          </mesh>

          {/* blush */}
          <mesh material={m.blush} position={[0.205, 0.3, 0.25]} rotation={[0, -0.55, 0]}>
            <circleGeometry args={[0.045, 8]} />
          </mesh>
          <mesh material={m.blush} position={[-0.205, 0.3, 0.25]} rotation={[0, 0.55, 0]}>
            <circleGeometry args={[0.045, 8]} />
          </mesh>

          <Hair style={doc.hairStyle} m={m} />
          <Accessory id={doc.accessory} m={m} />
        </group>
      </group>
    </group>
  );
}
