import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { Avatar } from "@ourspace/avatar";
import type { PhotoItem, PhotosModule, ProfileDoc } from "@ourspace/core";
import { useApp, type Screen } from "../store";
import { Prewarm } from "../components/Prewarm";
import { glowTexture } from "../components/glowTexture";
import { box, merge, place, tiledPlane, unindexed, type Vec3 } from "../components/geometry";
import {
  occlusionTexture,
  plasterTexture,
  runnerTexture,
  skylightTexture,
  wainscotTexture,
  washTexture,
  woodTexture,
} from "./roomTextures";
import { useNavigate } from "../navigation";

/**
 * The walkable room: the owner's images framed on facing walls, visited in
 * third person. Quiet, warm, the work is the point — the vert-menthe feeling.
 */

const HAZE = "#ebe0cd";
const FRAME = "#2a251d";
const MATTE = "#f8f4ea";

const ART_SPACING = 2.7;
const ART_Y = 1.72;
const ROOM_W = 9;
const WALL_H = 4.2;
const DADO_H = 1.0;
const ROOM_FRONT = 3.4;
const WALK_SPEED = 3.1;

function roomLength(count: number): number {
  return Math.ceil(count / 2) * ART_SPACING + 7;
}

function artSlot(index: number): { x: number; z: number; rotY: number } {
  const side = index % 2;
  const z = -2.6 - Math.floor(index / 2) * ART_SPACING;
  return side === 0
    ? { x: -ROOM_W / 2 + 0.05, z, rotY: Math.PI / 2 }
    : { x: ROOM_W / 2 - 0.05, z, rotY: -Math.PI / 2 };
}

/** The image on a cut mat, letterboxed so nothing is cropped. */
async function artTexture(src: string): Promise<THREE.CanvasTexture> {
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("image failed to load"));
    img.src = src;
  });
  const W = 1024;
  const H = 800;
  const margin = 88;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no 2d context");
  ctx.fillStyle = MATTE;
  ctx.fillRect(0, 0, W, H);
  const scale = Math.min((W - margin * 2) / img.width, (H - margin * 2) / img.height);
  const w = img.width * scale;
  const h = img.height * scale;
  const x = (W - w) / 2;
  const y = (H - h) / 2;
  // The mat's bevelled cut: lit on the top/left, shaded on the bottom/right.
  ctx.fillStyle = "#fffdf8";
  ctx.fillRect(x - 7, y - 7, w + 14, h + 14);
  ctx.fillStyle = "rgba(120, 104, 80, 0.32)";
  ctx.fillRect(x - 7, y + h, w + 14, 7);
  ctx.fillRect(x + w, y - 7, 7, h + 14);
  ctx.drawImage(img, x, y, w, h);
  ctx.strokeStyle = "rgba(42, 37, 29, 0.3)";
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);
  // A breath of shadow from the frame lip onto the mat.
  const lip = ctx.createLinearGradient(0, 0, 0, 40);
  lip.addColorStop(0, "rgba(60, 46, 30, 0.22)");
  lip.addColorStop(1, "rgba(60, 46, 30, 0)");
  ctx.fillStyle = lip;
  ctx.fillRect(0, 0, W, 40);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

function useKeys(): React.MutableRefObject<Set<string>> {
  const keys = useRef(new Set<string>());
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keys.current.add(e.key.toLowerCase());
    };
    const up = (e: KeyboardEvent) => {
      keys.current.delete(e.key.toLowerCase());
    };
    // Keyup never arrives for keys held across a focus loss (Alt-Tab, Win
    // key) — clear everything or the avatar walks forever on refocus.
    const clear = () => keys.current.clear();
    const onVisibility = () => {
      if (document.visibilityState === "hidden") clear();
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", clear);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", clear);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);
  return keys;
}

/** The module's name and its owner, lettered on the end wall like a show title. */
function TitlePlaque({
  title,
  owner,
  count,
  z,
}: {
  title: string;
  owner: string;
  count: number;
  z: number;
}) {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 384;
    const ctx = canvas.getContext("2d") as
      (CanvasRenderingContext2D & { letterSpacing?: string }) | null;
    if (ctx) {
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = FRAME;
      ctx.font = "italic 500 124px Georgia, 'Times New Roman', serif";
      ctx.fillText(title, 512, 150, 960);
      ctx.fillStyle = "rgba(42, 37, 29, 0.5)";
      ctx.fillRect(462, 246, 100, 3);
      ctx.letterSpacing = "9px";
      ctx.font = "600 30px Georgia, 'Times New Roman', serif";
      ctx.fillStyle = "rgba(42, 37, 29, 0.78)";
      const works = `${count} ${count === 1 ? "work" : "works"}`;
      ctx.fillText(`${owner} · ${works}`.toUpperCase(), 512, 300, 960);
    }
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  }, [title, owner, count]);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <mesh position={[0, 2.62, z]}>
      <planeGeometry args={[4.6, 1.725]} />
      <meshBasicMaterial map={texture} transparent depthWrite={false} toneMapped={false} />
    </mesh>
  );
}

/**
 * The room shell: limewash plaster above sage panelling, walnut rails, an oak
 * floor under a woven runner, and a skylit ceiling (open to the sky — atrium).
 * Each surface family is one merged mesh, so the whole shell is nine draws.
 */
function RoomShell({ length, accent }: { length: number; accent: string }) {
  const surfaces = useMemo(
    () => ({
      plaster: plasterTexture(),
      wood: woodTexture(),
      wainscot: wainscotTexture(),
      skylight: skylightTexture(),
      occlusion: occlusionTexture(),
    }),
    [],
  );
  const runner = useMemo(() => runnerTexture(accent), [accent]);
  useEffect(
    () => () => Object.values(surfaces).forEach((texture) => texture.dispose()),
    [surfaces],
  );
  useEffect(() => () => runner.dispose(), [runner]);

  const geometry = useMemo(() => {
    const span = length + ROOM_FRONT;
    const cz = (ROOM_FRONT - length) / 2;
    const halfW = ROOM_W / 2;
    const back = -length;
    // Each wall: its run, a point `offset` metres out from its surface at
    // height y, its facing, and whether its rails stop short of the side walls
    // (so no two rails share a corner and z-fight).
    const walls: Array<{
      run: number;
      at: (offset: number, y: number) => Vec3;
      rot: Vec3;
      end: boolean;
    }> = [
      { run: span, at: (o, y) => [-halfW + o, y, cz], rot: [0, Math.PI / 2, 0], end: false },
      { run: span, at: (o, y) => [halfW - o, y, cz], rot: [0, -Math.PI / 2, 0], end: false },
      { run: ROOM_W, at: (o, y) => [0, y, back + o], rot: [0, 0, 0], end: true },
      { run: ROOM_W, at: (o, y) => [0, y, ROOM_FRONT - o], rot: [0, Math.PI, 0], end: true },
    ];
    const rail = (wall: (typeof walls)[number], height: number, depth: number, y: number) =>
      box([wall.run - (wall.end ? depth * 2 : 0), height, depth], wall.at(depth / 2, y), wall.rot);

    const plaster = merge(
      walls.map((w) => tiledPlane(w.run, WALL_H, 2.4, 2.4, w.at(0, WALL_H / 2), w.rot)),
    );
    // Whole panels only: stretch the tile so each wall holds a round number.
    const wainscot = merge(
      walls.map((w) => {
        const tile = w.run / Math.max(1, Math.round(w.run / 2));
        return tiledPlane(w.run, DADO_H, tile, DADO_H, w.at(0.006, DADO_H / 2), w.rot);
      }),
    );
    const trim = merge(
      walls.flatMap((w) => [rail(w, 0.07, 0.07, DADO_H), rail(w, 0.17, 0.05, 0.085)]),
    );
    const crown = merge(
      walls.flatMap((w) => [
        rail(w, 0.1, 0.16, WALL_H - 0.05),
        rail(w, 0.05, 0.06, WALL_H - 0.125),
      ]),
    );
    // Soft contact shadow where the floor meets the walls and under the crown.
    const flat = (run: number, position: Vec3, turn: number) =>
      tiledPlane(run, 0.75, run, 0.75, position, [-Math.PI / 2, 0, turn]);
    const occlusion = merge([
      flat(span, [-halfW + 0.375, 0.006, cz], Math.PI / 2),
      flat(span, [halfW - 0.375, 0.006, cz], -Math.PI / 2),
      flat(ROOM_W, [0, 0.006, back + 0.375], 0),
      flat(ROOM_W, [0, 0.006, ROOM_FRONT - 0.375], Math.PI),
      ...walls.map((w) => tiledPlane(w.run, 0.7, w.run, 0.7, w.at(0.004, WALL_H - 0.5), w.rot)),
    ]);
    return {
      plaster,
      wainscot,
      trim,
      crown,
      occlusion,
      floor: tiledPlane(ROOM_W, span, 1.6, 1.6, [0, 0, cz], [-Math.PI / 2, 0, 0]),
      runner: tiledPlane(2.4, span - 1.6, 2.4, 4.8, [0, 0.012, cz], [-Math.PI / 2, 0, 0]),
      ceiling: tiledPlane(ROOM_W, span, 2.4, 2.4, [0, WALL_H, cz], [Math.PI / 2, 0, 0]),
      skylight: tiledPlane(3.2, span - 3, 1.6, 1.6, [0, WALL_H - 0.006, cz], [Math.PI / 2, 0, 0]),
    };
  }, [length]);
  useEffect(() => () => Object.values(geometry).forEach((value) => value.dispose()), [geometry]);

  return (
    <group>
      <mesh geometry={geometry.plaster}>
        <meshStandardMaterial map={surfaces.plaster} roughness={0.96} />
      </mesh>
      <mesh geometry={geometry.wainscot}>
        <meshStandardMaterial map={surfaces.wainscot} roughness={0.8} />
      </mesh>
      <mesh geometry={geometry.trim}>
        <meshStandardMaterial color="#4b3626" roughness={0.55} />
      </mesh>
      <mesh geometry={geometry.crown}>
        <meshStandardMaterial color="#f4ede1" roughness={0.9} />
      </mesh>
      <mesh geometry={geometry.floor}>
        <meshStandardMaterial map={surfaces.wood} roughness={0.58} />
      </mesh>
      <mesh geometry={geometry.runner}>
        <meshStandardMaterial map={runner} roughness={1} />
      </mesh>
      <mesh geometry={geometry.ceiling}>
        {/* Facing down, the ceiling only sees bounce: give it that glow directly. */}
        <meshStandardMaterial
          map={surfaces.plaster}
          color="#f6f0e6"
          emissive="#f3e6d0"
          emissiveMap={surfaces.plaster}
          emissiveIntensity={0.42}
          roughness={1}
        />
      </mesh>
      <mesh geometry={geometry.skylight}>
        <meshBasicMaterial map={surfaces.skylight} toneMapped={false} fog={false} />
      </mesh>
      <mesh geometry={geometry.occlusion} renderOrder={1}>
        <meshBasicMaterial
          color="#3a2614"
          map={surfaces.occlusion}
          transparent
          opacity={0.4}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

/** Low-poly potted fig: terracotta pot and a faceted crown — two draws. */
function Plant({ position, seed }: { position: Vec3; seed: number }) {
  const geometry = useMemo(() => {
    const pot = merge([
      place(new THREE.CylinderGeometry(0.27, 0.2, 0.52, 8), [0, 0.26, 0]),
      place(new THREE.CylinderGeometry(0.31, 0.29, 0.08, 8), [0, 0.53, 0]),
    ]);
    const parts: THREE.BufferGeometry[] = [
      place(new THREE.CylinderGeometry(0.025, 0.035, 1.1, 5), [0, 1.05, 0], [0, 0, 0.05]),
    ];
    const blobs: Array<[number, number, number, number]> = [
      [0, 1.72, 0, 0.42],
      [0.26, 1.42, 0.08, 0.3],
      [-0.24, 1.5, -0.06, 0.32],
      [0.06, 1.28, -0.22, 0.26],
      [-0.08, 2.02, 0.1, 0.26],
    ];
    for (const [x, y, z, r] of blobs) {
      parts.push(
        place(new THREE.IcosahedronGeometry(r, 0), [x, y, z], [seed + x * 3, seed * 2 + y, z * 5]),
      );
    }
    return { pot, leaves: merge(parts.map(unindexed)) };
  }, [seed]);
  useEffect(() => () => Object.values(geometry).forEach((value) => value.dispose()), [geometry]);
  return (
    <group position={position}>
      <mesh geometry={geometry.pot}>
        <meshStandardMaterial color="#b0613c" roughness={0.85} flatShading />
      </mesh>
      <mesh geometry={geometry.leaves}>
        <meshStandardMaterial color="#557a45" roughness={0.75} flatShading />
      </mesh>
    </group>
  );
}

/** Small cream wall labels — every caption in one atlas texture, one draw. */
function labelAtlas(items: PhotoItem[]): THREE.CanvasTexture {
  const cellW = 512;
  const cellH = 256;
  const rows = Math.max(1, Math.ceil(items.length / 2));
  const canvas = document.createElement("canvas");
  canvas.width = cellW * 2;
  canvas.height = cellH * rows;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    items.forEach((item, index) => {
      const x = (index % 2) * cellW;
      const y = Math.floor(index / 2) * cellH;
      ctx.fillStyle = "#f6f1e6";
      ctx.fillRect(x, y, cellW, cellH);
      ctx.fillStyle = "rgba(42, 37, 29, 0.14)";
      ctx.fillRect(x, y + cellH - 8, cellW, 8);
      ctx.fillStyle = FRAME;
      ctx.textBaseline = "top";
      ctx.font = "600 26px Georgia, 'Times New Roman', serif";
      ctx.fillText(`No. ${String(index + 1).padStart(2, "0")}`, x + 34, y + 30);
      ctx.font = "italic 400 40px Georgia, 'Times New Roman', serif";
      const caption = item.caption?.trim() || `Untitled ${index + 1}`;
      const lines: string[] = [];
      let line = "";
      for (const word of caption.split(/\s+/)) {
        const next = line ? `${line} ${word}` : word;
        if (line && ctx.measureText(next).width > cellW - 68) {
          lines.push(line);
          line = word;
        } else line = next;
      }
      if (line) lines.push(line);
      lines
        .slice(0, 3)
        .forEach((text, row) => ctx.fillText(text, x + 34, y + 80 + row * 48, cellW - 68));
    });
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

/**
 * Frames, gilt lips, picture lights, their washes and the wall labels for every
 * hung work, merged per material: sixteen pieces cost twenty draws.
 */
function Hang({
  items,
  textures,
}: {
  items: PhotoItem[];
  textures: (THREE.CanvasTexture | null)[];
}) {
  // Same material program as a loaded work, so swapping in the image never recompiles.
  const placeholder = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 4;
    canvas.height = 4;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = MATTE;
      ctx.fillRect(0, 0, 4, 4);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }, []);
  const wash = useMemo(() => washTexture(), []);
  const labels = useMemo(() => labelAtlas(items), [items]);
  useEffect(() => () => placeholder.dispose(), [placeholder]);
  useEffect(() => () => wash.dispose(), [wash]);
  useEffect(() => () => labels.dispose(), [labels]);

  const geometry = useMemo(() => {
    if (items.length === 0) return null;
    const frames: THREE.BufferGeometry[] = [];
    const brass: THREE.BufferGeometry[] = [];
    const washes: THREE.BufferGeometry[] = [];
    const cards: THREE.BufferGeometry[] = [];
    const rows = Math.max(1, Math.ceil(items.length / 2));
    items.forEach((_, index) => {
      const slot = artSlot(index);
      const parent = new THREE.Matrix4()
        .makeRotationY(slot.rotY)
        .setPosition(slot.x, ART_Y, slot.z);
      frames.push(box([1.46, 1.18, 0.07], [0, 0, -0.04], [0, 0, 0], parent));
      // Gilt fillet around the mat.
      brass.push(box([1.39, 0.026, 0.02], [0, 0.538, 0.004], [0, 0, 0], parent));
      brass.push(box([1.39, 0.026, 0.02], [0, -0.538, 0.004], [0, 0, 0], parent));
      brass.push(box([0.026, 1.05, 0.02], [0.683, 0, 0.004], [0, 0, 0], parent));
      brass.push(box([0.026, 1.05, 0.02], [-0.683, 0, 0.004], [0, 0, 0], parent));
      // Picture light: an arm off the wall and a long brass hood.
      brass.push(box([0.03, 0.03, 0.2], [0, 0.74, 0.05], [-0.5, 0, 0], parent));
      brass.push(
        place(
          new THREE.CylinderGeometry(0.036, 0.036, 0.66, 8),
          [0, 0.8, 0.15],
          [0, 0, Math.PI / 2],
          parent,
        ),
      );
      washes.push(place(new THREE.PlaneGeometry(2.4, 2.7), [0, -0.5, -0.038], [0, 0, 0], parent));
      const card = new THREE.PlaneGeometry(0.34, 0.17);
      const uv = card.getAttribute("uv");
      const u0 = (index % 2) * 0.5;
      const v0 = 1 - (Math.floor(index / 2) + 1) / rows;
      for (let i = 0; i < uv.count; i++) {
        uv.setXY(i, u0 + uv.getX(i) * 0.5, v0 + uv.getY(i) / rows);
      }
      cards.push(place(card, [1.02, -0.36, -0.034], [0, 0, 0], parent));
    });
    return {
      frames: merge(frames),
      brass: merge(brass),
      washes: merge(washes),
      cards: merge(cards),
    };
  }, [items]);
  useEffect(
    () => () => {
      if (geometry) Object.values(geometry).forEach((value) => value.dispose());
    },
    [geometry],
  );

  return (
    <group>
      {geometry && (
        <>
          <mesh geometry={geometry.washes} renderOrder={2}>
            <meshBasicMaterial
              map={wash}
              color="#ffcf8f"
              transparent
              opacity={0.3}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
          <mesh geometry={geometry.frames}>
            <meshStandardMaterial color={FRAME} roughness={0.45} />
          </mesh>
          <mesh geometry={geometry.brass}>
            <meshStandardMaterial color="#b8904f" metalness={0.35} roughness={0.38} flatShading />
          </mesh>
          <mesh geometry={geometry.cards}>
            <meshBasicMaterial map={labels} color="#ece6da" toneMapped={false} />
          </mesh>
        </>
      )}
      {items.map((item, index) => {
        const slot = artSlot(index);
        return (
          <group key={item.id} position={[slot.x, ART_Y, slot.z]} rotation={[0, slot.rotY, 0]}>
            <mesh position={[0, 0, 0.002]}>
              <planeGeometry args={[1.34, 1.05]} />
              <meshBasicMaterial map={textures[index] ?? placeholder} toneMapped={false} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

interface SceneProps {
  items: PhotoItem[];
  textures: (THREE.CanvasTexture | null)[];
  title: string;
  owner: string;
  accent: string;
  onNear: (index: number | null) => void;
}

const START_Z = 1.6;

function Scene({ items, textures, title, owner, accent, onNear }: SceneProps) {
  const profile = useApp((s) => s.profile);
  const camera = useThree((s) => s.camera);
  const keys = useKeys();
  const player = useRef<THREE.Group>(null);
  const heading = useRef(Math.PI);
  const nearRef = useRef<number | null>(null);
  const desired = useMemo(() => new THREE.Vector3(), []);
  const shadow = useMemo(() => glowTexture(), []);
  const [moving, setMoving] = useState(false);

  const length = roomLength(items.length);

  // Start exactly where the follow camera settles, so the first frame never snaps.
  useLayoutEffect(() => {
    camera.position.set(0, 2.3, START_Z + 4.1);
    camera.lookAt(0, 1.05, START_Z - 0.6);
  }, [camera]);

  useFrame((state, delta) => {
    const k = keys.current;
    let vx = 0;
    let vz = 0;
    if (k.has("w") || k.has("arrowup")) vz -= 1;
    if (k.has("s") || k.has("arrowdown")) vz += 1;
    if (k.has("a") || k.has("arrowleft")) vx -= 1;
    if (k.has("d") || k.has("arrowright")) vx += 1;
    const isMoving = vx !== 0 || vz !== 0;
    if (isMoving !== moving) setMoving(isMoving);

    const group = player.current;
    if (!group) return;

    if (isMoving) {
      const inv = 1 / Math.hypot(vx, vz);
      group.position.x += vx * inv * WALK_SPEED * delta;
      group.position.z += vz * inv * WALK_SPEED * delta;
      group.position.x = THREE.MathUtils.clamp(
        group.position.x,
        -ROOM_W / 2 + 0.7,
        ROOM_W / 2 - 0.7,
      );
      group.position.z = THREE.MathUtils.clamp(group.position.z, -length + 1.2, 2.6);

      const target = Math.atan2(vx, vz);
      let diff = target - heading.current;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      heading.current += diff * Math.min(1, delta * 12);
      group.rotation.y = heading.current;
    }

    // Camera trails behind and slightly above.
    const cam = state.camera;
    desired.set(group.position.x * 0.72, group.position.y + 2.3, group.position.z + 4.1);
    cam.position.lerp(desired, 1 - Math.exp(-5 * delta));
    cam.lookAt(group.position.x, group.position.y + 1.05, group.position.z - 0.6);

    // Nearest artwork within reach → caption overlay.
    let nearest: number | null = null;
    let best = 2.3;
    for (let i = 0; i < items.length; i++) {
      const slot = artSlot(i);
      const d = Math.hypot(slot.x - group.position.x, slot.z - group.position.z);
      if (d < best) {
        best = d;
        nearest = i;
      }
    }
    if (nearest !== nearRef.current) {
      nearRef.current = nearest;
      onNear(nearest);
    }
  });

  return (
    <>
      <color attach="background" args={[HAZE]} />
      <fog attach="fog" args={[HAZE, 12, 36]} />
      {/* Skylight daylight falling on both walls alike, warm oak bounce, a cool fill. */}
      <hemisphereLight args={["#fff4e2", "#8a6c4e", 1.3]} />
      <directionalLight position={[5, 9, 3]} intensity={1.05} color="#fff0da" />
      <directionalLight position={[-5, 9, 3]} intensity={1.05} color="#fff0da" />
      <directionalLight position={[0, 3, 8]} intensity={0.3} color="#dfe6ff" />

      <RoomShell length={length} accent={accent} />
      <TitlePlaque title={title} owner={owner} count={items.length} z={-length + 0.03} />
      <Plant position={[-ROOM_W / 2 + 0.75, 0, -length + 0.75]} seed={1} />
      <Plant position={[ROOM_W / 2 - 0.75, 0, -length + 0.75]} seed={2} />
      <Hang items={items} textures={textures} />

      {/* the visitor */}
      {profile && (
        <group ref={player} position={[0, 0, START_Z]} rotation={[0, Math.PI, 0]}>
          <Avatar doc={profile.avatar} moving={moving} />
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} renderOrder={1}>
            <planeGeometry args={[1.25, 1.25]} />
            <meshBasicMaterial
              color="#2b1c0f"
              map={shadow}
              transparent
              opacity={0.55}
              depthWrite={false}
            />
          </mesh>
        </group>
      )}
    </>
  );
}

export function GalleryPage({
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
  const goBack = useCallback(
    () => setScreen(returnScreen ?? { name: "profile" }),
    [returnScreen, setScreen],
  );
  const module = profile?.modules.find(
    (m): m is PhotosModule => m.id === moduleId && m.kind === "photos",
  );

  const items = useMemo(() => module?.items.slice(0, 16) ?? [], [module]);
  // null until every image is decoded and matted, so the room opens complete.
  const [textures, setTextures] = useState<(THREE.CanvasTexture | null)[] | null>(null);
  // `warm`: shaders compiled, frames running. `shown`: first frame drawn, fade in.
  const [warm, setWarm] = useState(false);
  const [shown, setShownFrame] = useState(false);
  const handleWarm = useCallback(() => setWarm(true), []);
  const handleShown = useCallback(() => setShownFrame(true), []);
  const [near, setNear] = useState<number | null>(null);
  // The label keeps its last text while it fades out.
  const [labelled, setLabelled] = useState(0);
  const handleNear = useCallback((index: number | null) => {
    setNear(index);
    if (index !== null) setLabelled(index);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let loaded: (THREE.CanvasTexture | null)[] = [];
    Promise.all(items.map((item) => artTexture(item.src).catch(() => null))).then((result) => {
      loaded = result;
      if (cancelled) result.forEach((t) => t?.dispose());
      else setTextures(result);
    });
    return () => {
      cancelled = true;
      loaded.forEach((t) => t?.dispose());
      setTextures(null);
    };
  }, [items]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") goBack();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goBack]);

  const missing = !profile || !module;
  useEffect(() => {
    if (missing) goBack();
  }, [goBack, missing]);
  if (missing) return null;

  const caption = items[labelled]?.caption?.trim() || `Untitled ${labelled + 1}`;
  const total = module.items.length;
  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div className={`gallery${shown ? " warm" : ""}`}>
      <Canvas
        className="room-canvas"
        frameloop={warm ? "always" : "never"}
        camera={{ fov: 48, position: [0, 2.3, START_Z + 4.1] }}
        dpr={[1, 1.75]}
      >
        <Scene
          items={items}
          textures={textures ?? []}
          title={module.title}
          owner={profile.name}
          accent={profile.avatar.top}
          onNear={handleNear}
        />
        {textures && <Prewarm onReady={handleWarm} onShown={handleShown} />}
      </Canvas>
      <div className="room-loading" aria-hidden={shown}>
        hanging the work…
      </div>
      <div className="gallery-ui">
        <button type="button" className="btn small gallery-back" onClick={goBack}>
          ← Back to page
        </button>
        <div className="gallery-hint">
          walk with WASD or arrows · esc to leave
          {total > items.length ? ` · showing first ${items.length} of ${total}` : ""}
        </div>
        <div className={`gallery-caption${near !== null ? " visible" : ""}`} aria-live="polite">
          <span className="gallery-caption-index">
            No. {pad(labelled + 1)} <span aria-hidden="true">/</span> {pad(items.length)}
          </span>
          <span className="gallery-caption-title">{caption}</span>
          <span className="gallery-caption-owner">{profile.name}</span>
        </div>
      </div>
    </div>
  );
}
