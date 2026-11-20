import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentRef,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { Avatar } from "@ourspace/avatar";
import { createRng, lerp, smoothstep, type MusicModule, type ProfileDoc } from "@ourspace/core";
import { useApp, type Screen } from "../store";
import { Prewarm } from "../components/Prewarm";
import { glowTexture } from "../components/glowTexture";
import {
  atlasPlane,
  box,
  merge,
  place,
  tiledPlane,
  tint,
  unindexed,
  type Vec3,
} from "../components/geometry";
import {
  LED_ROWS,
  LED_TITLE_ROWS,
  beamTexture,
  brickTextures,
  concreteTexture,
  consoleTextures,
  foamTexture,
  ledGradient,
  ledWallTexture,
  neonWashTexture,
  posterAtlas,
  recordTexture,
  speakerTextures,
  tileGlowTexture,
} from "./raveTextures";
import { useNavigate } from "../navigation";

// A basement club: brick, foam, an LED wall behind a raised booth, moving
// heads on a truss, a mirror ball and festoon bulbs over an LED dance floor.
const BPM = 124;
const HALF_W = 7.5;
const BACK_Z = -4.2;
const FRONT_Z = 7.6;
const CEIL = 5.6;
const DEPTH = FRONT_Z - BACK_Z;
const MID_Z = (FRONT_Z + BACK_Z) / 2;
const STAGE_H = 0.45;
const STAGE_FRONT = -1.5;
const STAGE_HALF_W = 4.2;
const CONSOLE_Z = -2.3;
const CONSOLE_TOP = 1.25;
const DJ_Z = -3.12;
const LED_W = 6.4;
const LED_H = 2.9;
const LED_Y = 2.8;
const TRUSS_Z = -0.55;
const TRUSS_Y = 5.25;
const BALL: Vec3 = [1.7, 4.3, 0.9];
const BALL_RADIUS = 0.34;
const TARGET: Vec3 = [0, 2.0, -1.6];
const AZIMUTH_LIMIT = 0.8;

const PINK = "#ff3dcc";
const CYAN = "#3dffd8";
const VIOLET = "#9b6bff";
const AMBER = "#ffb35c";

function beatAt(time: number) {
  const beats = (time * BPM) / 60;
  const count = Math.floor(beats);
  const phase = beats - count;
  return { count, phase, kick: Math.exp(-phase * 4.5) };
}

function disposeAll(record: Record<string, { dispose: () => void }>) {
  for (const value of Object.values(record)) value.dispose();
}

/** Brick shell, concrete floor, foam, posters, truss, neon lines and their washes. */
function RoomShell({ title, handle }: { title: string; handle: string }) {
  const surfaces = useMemo(() => {
    const brick = brickTextures();
    return {
      brick: brick.map,
      bump: brick.bump,
      foam: foamTexture(),
      concrete: concreteTexture(),
      posters: posterAtlas(title, handle),
      wash: neonWashTexture(),
    };
  }, [title, handle]);
  useEffect(() => () => disposeAll(surfaces), [surfaces]);

  const geometry = useMemo(() => {
    const walls = merge([
      tiledPlane(HALF_W * 2, CEIL, 1.6, 1.6, [0, CEIL / 2, BACK_Z]),
      tiledPlane(DEPTH, CEIL, 1.6, 1.6, [-HALF_W, CEIL / 2, MID_Z], [0, Math.PI / 2, 0]),
      tiledPlane(DEPTH, CEIL, 1.6, 1.6, [HALF_W, CEIL / 2, MID_Z], [0, -Math.PI / 2, 0]),
    ]);
    const floor = tiledPlane(HALF_W * 2, DEPTH, 3, 3, [0, 0, MID_Z], [-Math.PI / 2, 0, 0]);
    const ceiling = place(
      new THREE.PlaneGeometry(HALF_W * 2, DEPTH),
      [0, CEIL, MID_Z],
      [Math.PI / 2, 0, 0],
    );
    const foamX = [-6.25, -4.55, 4.55, 6.25];
    const foam = merge(foamX.map((x) => tiledPlane(1.5, 2.6, 0.5, 0.5, [x, 3.1, BACK_Z + 0.082])));

    // Dark metal: truss, LED frame, foam backing, skirting, ball drop, floor edging.
    const metal: THREE.BufferGeometry[] = [
      box([LED_W + 0.2, LED_H + 0.2, 0.14], [0, LED_Y, BACK_Z + 0.07]),
      box([HALF_W * 2, 0.14, 0.04], [0, 0.07, BACK_Z + 0.02]),
      box([0.04, 0.14, DEPTH], [-HALF_W + 0.02, 0.07, MID_Z]),
      box([0.04, 0.14, DEPTH], [HALF_W - 0.02, 0.07, MID_Z]),
      ...foamX.map((x) => box([1.58, 2.68, 0.08], [x, 3.1, BACK_Z + 0.04])),
    ];
    for (const dy of [-0.15, 0.15]) {
      for (const dz of [-0.15, 0.15]) {
        metal.push(box([12.6, 0.05, 0.05], [0, TRUSS_Y + dy, TRUSS_Z + dz]));
      }
    }
    for (let step = 0; step < 31; step++) {
      const x = -6.2 + step * 0.4 + 0.2;
      const lean = step % 2 ? 0.6435 : -0.6435;
      for (const dz of [-0.15, 0.15]) {
        metal.push(box([0.5, 0.025, 0.025], [x, TRUSS_Y, TRUSS_Z + dz], [0, 0, lean]));
      }
    }
    for (const x of [-5, -1.6, 1.6, 5]) {
      metal.push(
        box([0.02, CEIL - TRUSS_Y - 0.15, 0.02], [x, (CEIL + TRUSS_Y + 0.15) / 2, TRUSS_Z]),
      );
    }
    for (let head = 0; head < 4; head++) {
      metal.push(box([0.14, 0.2, 0.14], [-3 + head * 2, TRUSS_Y - 0.25, TRUSS_Z]));
    }
    const drop = CEIL - BALL[1] - BALL_RADIUS;
    metal.push(box([0.015, drop, 0.015], [BALL[0], CEIL - drop / 2, BALL[2]]));
    // Dance-floor edging
    metal.push(
      box([9.2, 0.03, 0.06], [0, 0.015, -1.13]),
      box([9.2, 0.03, 0.06], [0, 0.015, 4.93]),
      box([0.06, 0.03, 6.06], [-4.57, 0.015, 1.9]),
      box([0.06, 0.03, 6.06], [4.57, 0.015, 1.9]),
    );

    // Neon: one vertex-coloured mesh for every tube in the room.
    const neon = merge([
      tint(box([STAGE_HALF_W * 2, 0.04, 0.04], [0, STAGE_H + 0.01, STAGE_FRONT + 0.02]), PINK),
      tint(box([0.04, 0.04, DEPTH - 0.3], [-HALF_W + 0.06, 5.12, MID_Z]), CYAN),
      tint(box([0.04, 0.04, DEPTH - 0.3], [HALF_W - 0.06, 5.12, MID_Z]), CYAN),
      tint(box([HALF_W * 2 - 0.3, 0.04, 0.04], [0, 5.12, BACK_Z + 0.06]), VIOLET),
      tint(box([0.045, 4.6, 0.045], [-HALF_W + 0.14, 2.6, BACK_Z + 0.12]), PINK),
      tint(box([0.045, 4.6, 0.045], [HALF_W - 0.14, 2.6, BACK_Z + 0.12]), PINK),
    ]);
    const glow = (color: string, strength: number) =>
      new THREE.Color(color).multiplyScalar(strength);
    // Light each tube throws on the surface beside it.
    const washes = merge([
      tint(
        place(
          new THREE.PlaneGeometry(DEPTH - 0.3, 1.9),
          [-HALF_W + 0.02, 4.2, MID_Z],
          [0, Math.PI / 2, 0],
        ),
        glow(CYAN, 0.42),
      ),
      tint(
        place(
          new THREE.PlaneGeometry(DEPTH - 0.3, 1.9),
          [HALF_W - 0.02, 4.2, MID_Z],
          [0, -Math.PI / 2, 0],
        ),
        glow(CYAN, 0.42),
      ),
      tint(
        place(new THREE.PlaneGeometry(HALF_W * 2 - 0.3, 1.9), [0, 4.2, BACK_Z + 0.015]),
        glow(VIOLET, 0.5),
      ),
      tint(
        place(
          new THREE.PlaneGeometry(4.6, 1.5),
          [-HALF_W + 0.88, 2.6, BACK_Z + 0.015],
          [0, 0, Math.PI / 2],
        ),
        glow(PINK, 0.55),
      ),
      tint(
        place(
          new THREE.PlaneGeometry(4.6, 1.5),
          [HALF_W - 0.88, 2.6, BACK_Z + 0.015],
          [0, 0, -Math.PI / 2],
        ),
        glow(PINK, 0.55),
      ),
      tint(
        place(
          new THREE.PlaneGeometry(STAGE_HALF_W * 2, 1.1),
          [0, 0.004, STAGE_FRONT + 0.55],
          [-Math.PI / 2, 0, 0],
        ),
        glow(PINK, 0.6),
      ),
    ]);

    // Wheat-pasted posters, repeated in rows the way they are on real walls.
    const rng = createRng(`rave-poster-wall-${handle}`);
    const posterParts: THREE.BufferGeometry[] = [];
    const sides: Array<{ x: number; rot: number; designs: [number, number] }> = [
      { x: -HALF_W + 0.012, rot: Math.PI / 2, designs: [0, 1] },
      { x: HALF_W - 0.012, rot: -Math.PI / 2, designs: [2, 3] },
    ];
    for (const side of sides) {
      side.designs.forEach((design, row) => {
        for (let slot = 0; slot < 3; slot++) {
          const z = -2.7 + slot * 0.7 + row * 0.35 + (rng() - 0.5) * 0.05;
          const y = 1.95 + row * 0.96 + (rng() - 0.5) * 0.05;
          const lift = (row * 3 + slot) * 0.0015;
          const x = side.x + Math.sign(-side.x) * lift;
          posterParts.push(
            atlasPlane(
              0.64,
              0.9,
              [design / 4, 0, (design + 1) / 4, 1],
              [x, y, z],
              [0, side.rot, (rng() - 0.5) * 0.05],
            ),
          );
        }
      });
    }
    const posters = merge(posterParts);

    return {
      walls,
      floor,
      ceiling,
      foam,
      metal: merge(metal),
      neon,
      washes,
      posters,
      stage: box(
        [STAGE_HALF_W * 2, STAGE_H, BACK_Z * -1 + STAGE_FRONT],
        [0, STAGE_H / 2, (BACK_Z + STAGE_FRONT) / 2],
      ),
    };
  }, [handle]);
  useEffect(() => () => disposeAll(geometry), [geometry]);

  return (
    <>
      <mesh geometry={geometry.walls}>
        <meshLambertMaterial map={surfaces.brick} bumpMap={surfaces.bump} bumpScale={2.2} />
      </mesh>
      <mesh geometry={geometry.floor}>
        <meshStandardMaterial map={surfaces.concrete} roughness={0.36} metalness={0.12} />
      </mesh>
      <mesh geometry={geometry.ceiling}>
        <meshBasicMaterial color="#0b0910" />
      </mesh>
      <mesh geometry={geometry.foam}>
        <meshLambertMaterial map={surfaces.foam} />
      </mesh>
      <mesh geometry={geometry.metal}>
        <meshStandardMaterial color="#25212b" roughness={0.45} metalness={0.65} />
      </mesh>
      <mesh geometry={geometry.stage}>
        <meshStandardMaterial color="#1b1720" roughness={0.78} />
      </mesh>
      <mesh geometry={geometry.posters}>
        <meshLambertMaterial
          map={surfaces.posters}
          emissiveMap={surfaces.posters}
          emissive="#ffffff"
          emissiveIntensity={0.14}
        />
      </mesh>
      <mesh geometry={geometry.neon}>
        <meshBasicMaterial vertexColors toneMapped={false} />
      </mesh>
      <mesh geometry={geometry.washes} renderOrder={1}>
        <meshBasicMaterial
          map={surfaces.wash}
          vertexColors
          transparent
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </>
  );
}

/** The LED wall: lettered title on top, a live 32-band meter below, a halo in the haze. */
function LedWall({ title }: { title: string }) {
  const screen = useMemo(() => ledWallTexture(title), [title]);
  useEffect(() => () => screen.dispose(), [screen]);
  const screenMaterial = useRef<THREE.MeshBasicMaterial>(null);

  const columns = 32;
  const rows = 14;
  const meterWidth = LED_W - 0.4;
  const pitchX = meterWidth / columns;
  const bottom = LED_Y - LED_H / 2 + 0.16;
  const top = LED_Y + LED_H / 2 - (LED_H * LED_TITLE_ROWS) / LED_ROWS - 0.08;
  const pitchY = (top - bottom) / rows;
  const segment = useMemo(
    () => new THREE.PlaneGeometry(pitchX * 0.8, pitchY * 0.72),
    [pitchX, pitchY],
  );
  useEffect(() => () => segment.dispose(), [segment]);
  const meter = useRef<THREE.InstancedMesh>(null);
  const peaks = useRef(new Float32Array(columns));
  const rowColors = useMemo(
    () => Array.from({ length: rows }, (_, row) => ledGradient(1 - row / (rows - 1))),
    [],
  );

  useLayoutEffect(() => {
    const mesh = meter.current;
    if (!mesh) return;
    const matrix = new THREE.Matrix4();
    const off = new THREE.Color();
    for (let column = 0; column < columns; column++) {
      for (let row = 0; row < rows; row++) {
        const index = column * rows + row;
        matrix.makeTranslation(
          -meterWidth / 2 + pitchX * (column + 0.5),
          bottom + pitchY * (row + 0.5),
          0,
        );
        mesh.setMatrixAt(index, matrix);
        mesh.setColorAt(index, off.copy(rowColors[row] ?? off).multiplyScalar(0.06));
      }
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [bottom, meterWidth, pitchX, pitchY, rowColors]);

  const scratch = useMemo(() => new THREE.Color(), []);
  useFrame((state, delta) => {
    const time = state.clock.elapsedTime;
    const { kick } = beatAt(time);
    if (screenMaterial.current) screenMaterial.current.color.setScalar(0.88 + kick * 0.16);
    const mesh = meter.current;
    if (!mesh) return;
    for (let column = 0; column < columns; column++) {
      const bass = Math.max(0, 1 - column / 9);
      const body =
        0.28 + 0.22 * Math.sin(time * 1.3 + column * 0.35) * Math.sin(time * 0.7 + column * 0.11);
      const hats =
        0.2 *
        (0.5 + 0.5 * Math.sin(time * (6.1 + (column % 7) * 0.9) + column * 1.7)) *
        (column / columns);
      const level = Math.min(1, Math.max(0.04, body + kick * (0.5 * bass + 0.14) + hats));
      const peak = Math.max(level, (peaks.current[column] ?? 0) - delta * 0.55);
      peaks.current[column] = peak;
      const litRows = Math.round(level * rows);
      const peakRow = Math.min(rows - 1, Math.round(peak * rows));
      for (let row = 0; row < rows; row++) {
        const base = rowColors[row] ?? scratch;
        scratch.copy(base);
        if (row < litRows) scratch.multiplyScalar(1.15);
        else if (row === peakRow) scratch.lerp(new THREE.Color(1, 1, 1), 0.55);
        else scratch.multiplyScalar(0.06);
        mesh.setColorAt(column * rows + row, scratch);
      }
    }
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  return (
    <>
      <mesh position={[0, LED_Y, BACK_Z + 0.145]}>
        <planeGeometry args={[LED_W, LED_H]} />
        <meshBasicMaterial ref={screenMaterial} map={screen} toneMapped={false} />
      </mesh>
      <instancedMesh
        ref={meter}
        args={[segment, undefined, columns * rows]}
        position={[0, 0, BACK_Z + 0.16]}
        renderOrder={1}
      >
        <meshBasicMaterial
          transparent
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </instancedMesh>
      <mesh position={[0, LED_Y - 0.2, BACK_Z + 0.55]} renderOrder={2}>
        <planeGeometry args={[8.4, 4.8]} />
        <meshBasicMaterial
          map={glowTexture()}
          color="#5b33d6"
          transparent
          opacity={0.4}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </>
  );
}

/** The raised booth: console with the DJ's handle in neon, decks, spinning records, the DJ. */
function Booth({ profile }: { profile: ProfileDoc }) {
  const accent = profile.avatar.top;
  const surfaces = useMemo(() => {
    const face = consoleTextures(profile.username);
    return {
      face: face.map,
      faceGlow: face.glow,
      recordA: recordTexture(accent, "a"),
      recordB: recordTexture(profile.avatar.bottom, "b"),
    };
  }, [accent, profile.avatar.bottom, profile.username]);
  useEffect(() => () => disposeAll(surfaces), [surfaces]);

  const geometry = useMemo(() => {
    const body = box(
      [3.4, CONSOLE_TOP - STAGE_H, 0.9],
      [0, (CONSOLE_TOP + STAGE_H) / 2, CONSOLE_Z],
    );
    const gear: THREE.BufferGeometry[] = [
      box([3.52, 0.04, 1.0], [0, CONSOLE_TOP + 0.02, CONSOLE_Z]),
      box([0.62, 0.07, 0.62], [0, CONSOLE_TOP + 0.075, CONSOLE_Z]),
    ];
    for (const x of [-0.95, 0.95]) {
      gear.push(
        place(new THREE.CylinderGeometry(0.34, 0.34, 0.05, 24), [
          x,
          CONSOLE_TOP + 0.065,
          CONSOLE_Z,
        ]),
        box([0.03, 0.03, 0.42], [x + 0.36, CONSOLE_TOP + 0.11, CONSOLE_Z + 0.04], [0, 0.35, 0]),
      );
    }
    for (let column = 0; column < 3; column++) {
      for (let row = 0; row < 3; row++) {
        gear.push(
          place(new THREE.CylinderGeometry(0.028, 0.028, 0.035, 8), [
            -0.17 + column * 0.17,
            CONSOLE_TOP + 0.125,
            CONSOLE_Z - 0.2 + row * 0.13,
          ]),
        );
      }
    }
    for (const x of [-0.17, 0, 0.17]) {
      gear.push(box([0.04, 0.03, 0.06], [x, CONSOLE_TOP + 0.125, CONSOLE_Z + 0.2]));
    }
    return {
      body,
      gear: merge(gear),
      face: new THREE.PlaneGeometry(3.4, CONSOLE_TOP - STAGE_H),
      record: new THREE.CircleGeometry(0.3, 40),
    };
  }, []);
  useEffect(() => () => disposeAll(geometry), [geometry]);

  const faceMaterial = useRef<THREE.MeshStandardMaterial>(null);
  const records = useRef<Array<THREE.Group | null>>([]);
  useFrame((state, delta) => {
    for (const record of records.current) if (record) record.rotation.y -= delta * 3.49;
    const { kick } = beatAt(state.clock.elapsedTime);
    if (faceMaterial.current) faceMaterial.current.emissiveIntensity = 1.25 + kick * 0.45;
  });

  return (
    <>
      <mesh geometry={geometry.body}>
        <meshStandardMaterial color="#17131d" roughness={0.5} metalness={0.4} />
      </mesh>
      <mesh geometry={geometry.gear}>
        <meshStandardMaterial color="#302b38" roughness={0.38} metalness={0.7} />
      </mesh>
      <mesh geometry={geometry.face} position={[0, (CONSOLE_TOP + STAGE_H) / 2, CONSOLE_Z + 0.452]}>
        <meshStandardMaterial
          ref={faceMaterial}
          map={surfaces.face}
          emissiveMap={surfaces.faceGlow}
          emissive="#ffffff"
          emissiveIntensity={1.25}
          roughness={0.6}
        />
      </mesh>
      {[surfaces.recordA, surfaces.recordB].map((texture, index) => (
        <group
          key={index}
          position={[index ? 0.95 : -0.95, CONSOLE_TOP + 0.093, CONSOLE_Z]}
          ref={(node) => {
            records.current[index] = node;
          }}
        >
          <mesh geometry={geometry.record} rotation={[-Math.PI / 2, 0, 0]}>
            <meshStandardMaterial map={texture} roughness={0.32} metalness={0.2} />
          </mesh>
        </group>
      ))}
      <group position={[0, STAGE_H, DJ_Z]}>
        <Avatar doc={profile.avatar} performing />
      </group>
      <mesh position={[0, STAGE_H + 0.004, DJ_Z]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.3, 1.3]} />
        <meshBasicMaterial
          map={glowTexture()}
          color="#000000"
          transparent
          opacity={0.6}
          depthWrite={false}
        />
      </mesh>
    </>
  );
}

/** Two stacks either side of the stage, toed in; woofer rims pulse on the kick. */
function Speakers() {
  const surfaces = useMemo(() => speakerTextures(), []);
  useEffect(() => () => disposeAll(surfaces), [surfaces]);
  const geometry = useMemo(() => {
    const cabinets: THREE.BufferGeometry[] = [];
    const faces: THREE.BufferGeometry[] = [];
    for (const side of [-1, 1]) {
      const parent = new THREE.Matrix4()
        .makeRotationY(-side * 0.22)
        .setPosition(side * 5.25, 0, -3.2);
      cabinets.push(
        box([1.2, 1.2, 1.0], [0, 0.6, 0], [0, 0, 0], parent),
        box([1.0, 1.0, 0.85], [0, 1.7, 0.05], [0, 0, 0], parent),
      );
      faces.push(
        atlasPlane(1.16, 1.16, [0, 0, 0.5, 1], [0, 0.6, 0.502]).applyMatrix4(parent),
        atlasPlane(0.96, 0.96, [0.5, 0, 1, 1], [0, 1.7, 0.477]).applyMatrix4(parent),
      );
    }
    return { cabinets: merge(cabinets), faces: merge(faces) };
  }, []);
  useEffect(() => () => disposeAll(geometry), [geometry]);
  const faceMaterial = useRef<THREE.MeshStandardMaterial>(null);
  useFrame((state) => {
    const { kick } = beatAt(state.clock.elapsedTime);
    if (faceMaterial.current) faceMaterial.current.emissiveIntensity = 0.7 + kick * 1.6;
  });
  return (
    <>
      <mesh geometry={geometry.cabinets}>
        <meshStandardMaterial color="#1c1922" roughness={0.85} />
      </mesh>
      <mesh geometry={geometry.faces}>
        <meshStandardMaterial
          ref={faceMaterial}
          map={surfaces.map}
          emissiveMap={surfaces.glow}
          emissive="#ffffff"
          emissiveIntensity={0.7}
          roughness={0.75}
        />
      </mesh>
    </>
  );
}

const FLOOR_COLUMNS = 9;
const FLOOR_ROWS = 6;

/** LED dance floor: 54 tiles in one draw, cycling ripple / checker / sweep. */
function DanceFloor() {
  const texture = useMemo(() => tileGlowTexture(), []);
  useEffect(() => () => texture.dispose(), [texture]);
  const tile = useMemo(() => new THREE.PlaneGeometry(0.94, 0.94).rotateX(-Math.PI / 2), []);
  useEffect(() => () => tile.dispose(), [tile]);
  const tiles = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    const mesh = tiles.current;
    if (!mesh) return;
    const matrix = new THREE.Matrix4();
    const black = new THREE.Color(0, 0, 0);
    for (let row = 0; row < FLOOR_ROWS; row++) {
      for (let column = 0; column < FLOOR_COLUMNS; column++) {
        const index = row * FLOOR_COLUMNS + column;
        matrix.makeTranslation(column - 4, 0.006, 1.9 + (row - 2.5));
        mesh.setMatrixAt(index, matrix);
        mesh.setColorAt(index, black);
      }
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, []);

  const color = useMemo(() => new THREE.Color(), []);
  useFrame((state) => {
    const mesh = tiles.current;
    if (!mesh) return;
    const time = state.clock.elapsedTime;
    const { count, phase, kick } = beatAt(time);
    const mode = Math.floor(count / 8) % 3;
    const previous = (mode + 2) % 3;
    const blend = smoothstep(0, 1, (count % 8) + phase);
    const pattern = (which: number, column: number, row: number) => {
      if (which === 0) {
        const distance = Math.hypot(column - 4, row - 2.5);
        return 0.5 + 0.5 * Math.sin(distance * 1.35 - time * 3.2);
      }
      if (which === 1) return (column + row + count) % 2 === 0 ? 1 : 0.12;
      return 0.5 + 0.5 * Math.sin(column * 0.9 - time * 4);
    };
    for (let row = 0; row < FLOOR_ROWS; row++) {
      for (let column = 0; column < FLOOR_COLUMNS; column++) {
        const shape = lerp(pattern(previous, column, row), pattern(mode, column, row), blend);
        const level = 0.1 + shape * (0.34 + 0.28 * kick);
        ledGradient(0.5 + 0.5 * Math.sin(time * 0.35 + column * 0.3 + row * 0.22), color);
        mesh.setColorAt(row * FLOOR_COLUMNS + column, color.multiplyScalar(level));
      }
    }
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={tiles} args={[tile, undefined, FLOOR_COLUMNS * FLOOR_ROWS]} renderOrder={1}>
      <meshBasicMaterial
        map={texture}
        transparent
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
      />
    </instancedMesh>
  );
}

const HEADS = [PINK, CYAN, VIOLET, AMBER];
const BEAM_LENGTH = 6.6;
const BEAM_ANGLE = 0.2;

/** Four moving heads on the truss, each a real spotlight with a beam cone in the haze. */
function MovingHeads() {
  const beam = useMemo(() => beamTexture(), []);
  useEffect(() => () => beam.dispose(), [beam]);
  const geometry = useMemo(
    () => ({
      body: box([0.26, 0.32, 0.26], [0, -0.06, 0]),
      cone: new THREE.CylinderGeometry(
        0.07,
        BEAM_LENGTH * Math.tan(BEAM_ANGLE) * 0.85,
        BEAM_LENGTH,
        20,
        1,
        true,
      ),
    }),
    [],
  );
  useEffect(() => () => disposeAll(geometry), [geometry]);
  const targets = useMemo(() => HEADS.map(() => new THREE.Object3D()), []);
  const pans = useRef<Array<THREE.Group | null>>([]);
  const tilts = useRef<Array<THREE.Group | null>>([]);

  useFrame((state) => {
    const time = state.clock.elapsedTime;
    HEADS.forEach((_, index) => {
      const pan = pans.current[index];
      const tilt = tilts.current[index];
      if (pan) pan.rotation.y = Math.PI + 0.75 * Math.sin(time * 0.31 + index * 1.7);
      if (tilt) tilt.rotation.x = 0.42 + 0.22 * Math.sin(time * 0.47 + index * 2.3);
    });
  });

  return (
    <>
      {HEADS.map((color, index) => (
        <group key={color} position={[-3 + index * 2, TRUSS_Y - 0.42, TRUSS_Z]}>
          <group
            ref={(node) => {
              pans.current[index] = node;
            }}
          >
            <group
              ref={(node) => {
                tilts.current[index] = node;
              }}
            >
              <mesh geometry={geometry.body}>
                <meshStandardMaterial color="#211d27" roughness={0.4} metalness={0.6} />
              </mesh>
              <spotLight
                position={[0, -0.2, 0]}
                target={targets[index]}
                color={color}
                intensity={30}
                angle={BEAM_ANGLE}
                penumbra={0.5}
                distance={14}
              />
              <primitive object={targets[index] ?? new THREE.Object3D()} position={[0, -8, 0]} />
              <mesh
                geometry={geometry.cone}
                position={[0, -0.22 - BEAM_LENGTH / 2, 0]}
                renderOrder={3}
              >
                <meshBasicMaterial
                  map={beam}
                  color={color}
                  transparent
                  opacity={0.32}
                  blending={THREE.AdditiveBlending}
                  depthWrite={false}
                  toneMapped={false}
                />
              </mesh>
              <sprite position={[0, -0.23, 0]} scale={[0.6, 0.6, 1]} renderOrder={3}>
                <spriteMaterial
                  map={glowTexture()}
                  color={color}
                  blending={THREE.AdditiveBlending}
                  depthWrite={false}
                  toneMapped={false}
                />
              </sprite>
            </group>
          </group>
        </group>
      ))}
    </>
  );
}

const SPARKLES = 170;

/** A faceted mirror ball, and the spots it throws sweeping slowly round the walls. */
function MirrorBall() {
  // Each mirror tile holds a reflection of the room: mostly silver, some catching
  // the neon. Tiles flash white as they turn past a light.
  const ball = useMemo(() => {
    const geometry = unindexed(new THREE.IcosahedronGeometry(BALL_RADIUS, 2));
    const rng = createRng("rave-mirror-ball");
    const faces = geometry.getAttribute("position").count / 3;
    const reflections = [
      new THREE.Color("#b9b2cc"),
      new THREE.Color("#8d86a6"),
      new THREE.Color("#5d5675"),
      new THREE.Color(PINK).multiplyScalar(0.8),
      new THREE.Color(CYAN).multiplyScalar(0.7),
      new THREE.Color(VIOLET).multiplyScalar(0.8),
    ];
    const base = new Float32Array(faces * 3);
    const phase = new Float32Array(faces);
    for (let face = 0; face < faces; face++) {
      const pick = rng();
      const tone =
        reflections[
          pick < 0.3 ? 0 : pick < 0.58 ? 1 : pick < 0.78 ? 2 : pick < 0.86 ? 3 : pick < 0.93 ? 4 : 5
        ] ?? reflections[0];
      const shade = 0.75 + rng() * 0.35;
      base[face * 3] = (tone?.r ?? 0.7) * shade;
      base[face * 3 + 1] = (tone?.g ?? 0.7) * shade;
      base[face * 3 + 2] = (tone?.b ?? 0.7) * shade;
      phase[face] = rng() * Math.PI * 2;
    }
    geometry.setAttribute("color", new THREE.BufferAttribute(new Float32Array(faces * 9), 3));
    return { geometry, base, phase, faces };
  }, []);
  useEffect(() => () => ball.geometry.dispose(), [ball]);

  const sparkle = useMemo(() => {
    const rng = createRng("rave-sparkles");
    const directions: THREE.Vector3[] = [];
    while (directions.length < SPARKLES) {
      const y = rng() * 2 - 1;
      if (y > 0.25) continue;
      const angle = rng() * Math.PI * 2;
      const radius = Math.sqrt(1 - y * y);
      directions.push(new THREE.Vector3(radius * Math.cos(angle), y, radius * Math.sin(angle)));
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(SPARKLES * 3), 3));
    const colors = new Float32Array(SPARKLES * 3);
    const tones = [new THREE.Color("#fff1dc"), new THREE.Color(PINK), new THREE.Color(CYAN)];
    directions.forEach((_, index) => {
      const pick = rng();
      const tone = tones[pick < 0.7 ? 0 : pick < 0.85 ? 1 : 2] ?? tones[0];
      colors[index * 3] = tone?.r ?? 1;
      colors[index * 3 + 1] = tone?.g ?? 1;
      colors[index * 3 + 2] = tone?.b ?? 1;
    });
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return { directions, geometry };
  }, []);
  useEffect(() => () => sparkle.geometry.dispose(), [sparkle]);

  const ballMesh = useRef<THREE.Mesh>(null);
  const rotated = useMemo(() => new THREE.Vector3(), []);
  const up = useMemo(() => new THREE.Vector3(0, 1, 0), []);
  useFrame((state) => {
    const time = state.clock.elapsedTime;
    const spin = time * 0.26;
    if (ballMesh.current) ballMesh.current.rotation.y = spin;
    const colors = ball.geometry.getAttribute("color") as THREE.BufferAttribute;
    for (let face = 0; face < ball.faces; face++) {
      const flash = Math.max(0, Math.sin(time * 1.9 + (ball.phase[face] ?? 0) * 3)) ** 40;
      for (let channel = 0; channel < 3; channel++) {
        const value = (ball.base[face * 3 + channel] ?? 0) * (1 - flash) + 1.4 * flash;
        for (let corner = 0; corner < 3; corner++) {
          colors.array[(face * 3 + corner) * 3 + channel] = value;
        }
      }
    }
    colors.needsUpdate = true;
    const positions = sparkle.geometry.getAttribute("position") as THREE.BufferAttribute;
    const [bx, by, bz] = BALL;
    sparkle.directions.forEach((direction, index) => {
      rotated.copy(direction).applyAxisAngle(up, spin);
      const { x, y, z } = rotated;
      const tx = x > 0 ? (HALF_W - 0.02 - bx) / x : x < 0 ? (-HALF_W + 0.02 - bx) / x : Infinity;
      const ty = y > 0 ? (CEIL - 0.02 - by) / y : y < 0 ? (0.01 - by) / y : Infinity;
      const tz = z > 0 ? (FRONT_Z - bz) / z : z < 0 ? (BACK_Z + 0.03 - bz) / z : Infinity;
      const hit = Math.min(tx, ty, tz) - 0.08;
      positions.setXYZ(index, bx + x * hit, by + y * hit, bz + z * hit);
    });
    positions.needsUpdate = true;
  });

  return (
    <>
      <mesh ref={ballMesh} geometry={ball.geometry} position={BALL}>
        <meshBasicMaterial vertexColors toneMapped={false} />
      </mesh>
      <sprite position={BALL} scale={[1.9, 1.9, 1]} renderOrder={3}>
        <spriteMaterial
          map={glowTexture()}
          color="#c9b4ff"
          opacity={0.36}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </sprite>
      <points geometry={sparkle.geometry} renderOrder={2} frustumCulled={false}>
        <pointsMaterial
          map={glowTexture()}
          size={0.2}
          vertexColors
          transparent
          opacity={0.75}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </points>
    </>
  );
}

/** Warm festoon bulbs strung across the room — the room's living-room heart. */
function Festoons() {
  const built = useMemo(() => {
    const strings = [0.25, 2.2];
    const bulbs: THREE.Vector3[] = [];
    const wire: number[] = [];
    for (const z of strings) {
      const sag = (x: number) => 5.2 - 0.66 * (1 - (x / HALF_W) ** 2);
      for (let step = 0; step < 48; step++) {
        const x0 = -HALF_W + (step / 48) * HALF_W * 2;
        const x1 = -HALF_W + ((step + 1) / 48) * HALF_W * 2;
        wire.push(x0, sag(x0), z, x1, sag(x1), z);
      }
      for (let bulb = 0; bulb < 23; bulb++) {
        const x = -HALF_W + 0.65 + bulb * 0.6;
        bulbs.push(new THREE.Vector3(x, sag(x) - 0.09, z));
      }
    }
    const wireGeometry = new THREE.BufferGeometry();
    wireGeometry.setAttribute("position", new THREE.Float32BufferAttribute(wire, 3));
    const glowGeometry = new THREE.BufferGeometry().setFromPoints(bulbs);
    return {
      bulbs,
      wire: wireGeometry,
      glow: glowGeometry,
      bulb: new THREE.IcosahedronGeometry(0.035, 0),
    };
  }, []);
  useEffect(
    () => () => {
      built.wire.dispose();
      built.glow.dispose();
      built.bulb.dispose();
    },
    [built],
  );
  const bulbMesh = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = bulbMesh.current;
    if (!mesh) return;
    const matrix = new THREE.Matrix4();
    built.bulbs.forEach((position, index) => {
      matrix.makeTranslation(position.x, position.y, position.z);
      mesh.setMatrixAt(index, matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, [built]);

  return (
    <>
      <lineSegments geometry={built.wire}>
        <lineBasicMaterial color="#0a080c" />
      </lineSegments>
      <instancedMesh ref={bulbMesh} args={[built.bulb, undefined, built.bulbs.length]}>
        <meshBasicMaterial color="#ffd8a0" toneMapped={false} />
      </instancedMesh>
      <points geometry={built.glow} renderOrder={2}>
        <pointsMaterial
          map={glowTexture()}
          size={1.25}
          color="#ffad55"
          transparent
          opacity={0.6}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </points>
    </>
  );
}

/** Warm key light on the DJ, so the person is never lost in their own room. */
function KeyLight() {
  const target = useMemo(() => new THREE.Object3D(), []);
  return (
    <>
      <spotLight
        position={[0, 5.2, 0.8]}
        target={target}
        color="#ffc28c"
        intensity={34}
        angle={0.3}
        penumbra={0.75}
        distance={14}
      />
      <primitive object={target} position={[0, 1.6, DJ_Z]} />
    </>
  );
}

/** Orbit with a short dolly-in on arrival, then a slow side-to-side drift. */
function CameraRig() {
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  const camera = useThree((state) => state.camera);
  const start = useRef<number | null>(null);
  const touched = useRef(false);
  const direction = useRef(1);
  const speed = useRef(1);
  const spherical = useMemo(() => new THREE.Spherical(), []);
  const offset = useMemo(() => new THREE.Vector3(), []);

  const placeCamera = useCallback(
    (radius: number, polar: number, azimuth: number) => {
      spherical.set(radius, polar, azimuth);
      offset.setFromSpherical(spherical);
      camera.position.set(TARGET[0] + offset.x, TARGET[1] + offset.y, TARGET[2] + offset.z);
      camera.lookAt(...TARGET);
    },
    [camera, offset, spherical],
  );

  useLayoutEffect(() => placeCamera(8.8, 1.26, -0.42), [placeCamera]);

  useFrame((state, delta) => {
    const orbit = controls.current;
    if (!orbit) return;
    if (start.current === null) start.current = state.clock.elapsedTime;
    const progress = Math.min(1, (state.clock.elapsedTime - start.current) / 3.4);
    if (progress < 1 && !touched.current) {
      const eased = smoothstep(0, 1, progress);
      placeCamera(lerp(8.8, 7.6, eased), lerp(1.26, 1.38, eased), lerp(-0.42, 0, eased));
      orbit.autoRotate = false;
      orbit.update();
      return;
    }
    orbit.autoRotate = true;
    // A positive autoRotateSpeed lowers the azimuth; turn round softly at the limits.
    const azimuth = orbit.getAzimuthalAngle();
    if (azimuth > AZIMUTH_LIMIT) direction.current = 1;
    else if (azimuth < -AZIMUTH_LIMIT) direction.current = -1;
    speed.current += (direction.current - speed.current) * Math.min(1, delta * 0.6);
    orbit.autoRotateSpeed = 0.4 * speed.current;
  });

  return (
    <OrbitControls
      ref={controls}
      target={TARGET}
      enablePan={false}
      minDistance={4.4}
      maxDistance={8.8}
      minPolarAngle={1.0}
      maxPolarAngle={1.5}
      minAzimuthAngle={-1.05}
      maxAzimuthAngle={1.05}
      onStart={() => {
        touched.current = true;
      }}
    />
  );
}

function RaveScene({ module, profile }: { module: MusicModule; profile: ProfileDoc }) {
  return (
    <>
      <color attach="background" args={["#0c0814"]} />
      <fog attach="fog" args={["#110a1b", 10, 26]} />
      <hemisphereLight args={["#7a5cc8", "#140b18", 0.62]} />
      <pointLight position={[-4.8, 2.8, -1.4]} color={PINK} intensity={10} distance={9} />
      <pointLight position={[4.8, 2.8, -1.4]} color={CYAN} intensity={10} distance={9} />
      <KeyLight />
      <RoomShell title={module.title} handle={profile.username} />
      <LedWall title={module.title} />
      <Booth profile={profile} />
      <Speakers />
      <DanceFloor />
      <MovingHeads />
      <MirrorBall />
      <Festoons />
      <CameraRig />
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
  const setScreen = useNavigate();
  const profile = profileOverride ?? localProfile;
  const [warm, setWarm] = useState(false);
  const [shown, setShown] = useState(false);
  const handleWarm = useCallback(() => setWarm(true), []);
  const handleShown = useCallback(() => setShown(true), []);
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
    <main className={`rave${shown ? " warm" : ""}`}>
      <Canvas
        className="room-canvas"
        frameloop={warm ? "always" : "never"}
        camera={{ fov: 50, position: [0, 3.4, 6.6] }}
        dpr={[1, 1.75]}
      >
        <RaveScene module={module} profile={profile} />
        <Prewarm onReady={handleWarm} onShown={handleShown} />
      </Canvas>
      <p className="room-loading" aria-hidden={shown}>
        warming up the booth…
      </p>
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
