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
  /** Explicit animation state for authored sequences such as the orbit launch. */
  motion?: AvatarMotion;
};

export type AvatarMotion = "idle" | "walk" | "run" | "jump" | "fall" | "land" | "perform";

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

export function Avatar({
  doc,
  moving = false,
  performing = false,
  motion,
  ...groupProps
}: AvatarProps) {
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
  const shinL = useRef<THREE.Group>(null);
  const shinR = useRef<THREE.Group>(null);
  const footL = useRef<THREE.Group>(null);
  const footR = useRef<THREE.Group>(null);
  const activeMotion = motion ?? (performing ? "perform" : moving ? "walk" : "idle");
  const previousMotion = useRef<AvatarMotion>(activeMotion);
  const motionStartedAt = useRef(0);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    if (previousMotion.current !== activeMotion) {
      previousMotion.current = activeMotion;
      motionStartedAt.current = t;
    }
    const localTime = t - motionStartedAt.current;
    const idle = Math.sin(t * 2);
    const damp = (current: number, target: number, speed = 12) =>
      THREE.MathUtils.damp(current, target, speed, delta);

    let armLX = idle * 0.045;
    let armRX = -idle * 0.045;
    let armLZ = 0;
    let armRZ = 0;
    let legLX = 0;
    let legRX = 0;
    let legLZ = 0;
    let legRZ = 0;
    let shinLX = 0;
    let shinRX = 0;
    let footLX = 0;
    let footRX = 0;
    let bodyY = idle * 0.01;
    let bodyX = 0;
    let bodyZ = 0;
    let headX = 0;
    let headZ = idle * 0.018;

    if (activeMotion === "walk" || activeMotion === "run") {
      const running = activeMotion === "run";
      const swing = Math.sin(localTime * (running ? 11.2 : 7.1));
      const stride = running ? 0.82 : 0.5;
      legLX = -swing * stride;
      legRX = swing * stride;
      shinLX = Math.max(0, swing) * (running ? 0.92 : 0.5);
      shinRX = Math.max(0, -swing) * (running ? 0.92 : 0.5);
      footLX = -shinLX * 0.62;
      footRX = -shinRX * 0.62;
      armLX = swing * (running ? 0.88 : 0.52);
      armRX = -armLX;
      bodyY = Math.abs(swing) * (running ? 0.055 : 0.025);
      bodyX = running ? 0.13 : 0.035;
      bodyZ = swing * (running ? 0.025 : 0.012);
      headX = running ? -0.055 : 0.018;
      headZ = -bodyZ * 0.6;
    } else if (activeMotion === "jump") {
      const anticipation = 1 - Math.min(1, localTime / 0.24);
      const release = Math.min(1, Math.max(0, (localTime - 0.18) / 0.28));
      bodyY = -anticipation * 0.12 + release * 0.035;
      bodyX = 0.16;
      legLX = -0.18 * anticipation + 0.34 * release;
      legRX = -0.18 * anticipation - 0.12 * release;
      shinLX = 0.72 * anticipation + 0.36 * release;
      shinRX = 0.72 * anticipation + 0.62 * release;
      armLX = 0.65 * anticipation - 1.05 * release;
      armRX = armLX * 0.86;
      headX = -0.08;
    } else if (activeMotion === "fall") {
      const drift = Math.sin(localTime * 2.7);
      bodyX = 0.08 + drift * 0.035;
      bodyZ = drift * 0.04;
      armLX = 0.22 + drift * 0.12;
      armRX = 0.22 - drift * 0.12;
      armLZ = -0.78;
      armRZ = 0.78;
      legLX = 0.18 + drift * 0.12;
      legRX = -0.12 - drift * 0.1;
      legLZ = -0.12;
      legRZ = 0.12;
      shinLX = 0.28;
      shinRX = 0.42;
      headX = -0.12;
      headZ = -drift * 0.06;
    } else if (activeMotion === "land") {
      const impact = Math.exp(-localTime * 4.8);
      bodyY = -0.17 * impact;
      bodyX = 0.16 * impact;
      legLX = -0.24 * impact;
      legRX = -0.2 * impact;
      shinLX = 0.88 * impact;
      shinRX = 0.82 * impact;
      armLX = -0.72 * impact;
      armRX = -0.58 * impact;
      armLZ = -0.18 * impact;
      armRZ = 0.18 * impact;
      headX = 0.11 * impact;
    } else if (activeMotion === "perform") {
      const beat = Math.sin(localTime * 5.5);
      armLX = -1.02 + beat * 0.18;
      armRX = armLX - beat * 0.12;
      armLZ = -0.18;
      armRZ = 0.18;
      bodyY = Math.max(0, beat) * 0.035;
      headZ = beat * 0.055;
    }

    if (armL.current) {
      armL.current.rotation.x = damp(armL.current.rotation.x, armLX);
      armL.current.rotation.z = damp(armL.current.rotation.z, armLZ);
    }
    if (armR.current) {
      armR.current.rotation.x = damp(armR.current.rotation.x, armRX);
      armR.current.rotation.z = damp(armR.current.rotation.z, armRZ);
    }
    if (legL.current) {
      legL.current.rotation.x = damp(legL.current.rotation.x, legLX);
      legL.current.rotation.z = damp(legL.current.rotation.z, legLZ);
    }
    if (legR.current) {
      legR.current.rotation.x = damp(legR.current.rotation.x, legRX);
      legR.current.rotation.z = damp(legR.current.rotation.z, legRZ);
    }
    if (shinL.current) shinL.current.rotation.x = damp(shinL.current.rotation.x, shinLX);
    if (shinR.current) shinR.current.rotation.x = damp(shinR.current.rotation.x, shinRX);
    if (footL.current) footL.current.rotation.x = damp(footL.current.rotation.x, footLX);
    if (footR.current) footR.current.rotation.x = damp(footR.current.rotation.x, footRX);
    if (body.current) {
      body.current.position.y = damp(body.current.position.y, bodyY);
      body.current.rotation.x = damp(body.current.rotation.x, bodyX);
      body.current.rotation.z = damp(body.current.rotation.z, bodyZ);
    }
    if (head.current) {
      head.current.rotation.z = damp(head.current.rotation.z, headZ);
      head.current.rotation.x = damp(head.current.rotation.x, headX);
    }
  });

  return (
    <group {...groupProps}>
      <group ref={body}>
        <group ref={legL} position={[0.115, 0.7, 0]}>
          <mesh material={materials.bottom} position={[0, -0.19, 0]}>
            <cylinderGeometry args={[0.085, 0.07, 0.38, 5]} />
          </mesh>
          <group ref={shinL} position={[0, -0.38, 0]}>
            <mesh material={materials.bottom} position={[0, -0.14, 0]}>
              <cylinderGeometry args={[0.068, 0.055, 0.28, 5]} />
            </mesh>
            <group ref={footL} position={[0, -0.32, 0.065]}>
              <mesh material={materials.shoes}>
                <boxGeometry args={[0.16, 0.12, 0.28]} />
              </mesh>
            </group>
          </group>
        </group>
        <group ref={legR} position={[-0.115, 0.7, 0]}>
          <mesh material={materials.bottom} position={[0, -0.19, 0]}>
            <cylinderGeometry args={[0.085, 0.07, 0.38, 5]} />
          </mesh>
          <group ref={shinR} position={[0, -0.38, 0]}>
            <mesh material={materials.bottom} position={[0, -0.14, 0]}>
              <cylinderGeometry args={[0.068, 0.055, 0.28, 5]} />
            </mesh>
            <group ref={footR} position={[0, -0.32, 0.065]}>
              <mesh material={materials.shoes}>
                <boxGeometry args={[0.16, 0.12, 0.28]} />
              </mesh>
            </group>
          </group>
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
