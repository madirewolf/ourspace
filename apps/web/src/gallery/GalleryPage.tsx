import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Avatar } from "@atrium/avatar";
import type { PhotoItem, PhotosModule } from "@atrium/core";
import { useApp } from "../store";

/**
 * The walkable room: the owner's images framed on facing walls, visited in
 * third person. Quiet, warm, the work is the point — the vert-menthe feeling.
 */

const WALL = "#efe8d9";
const FLOOR = "#c9b69c";
const FRAME = "#2a251d";
const MATTE = "#f8f4ea";

const ART_SPACING = 2.7;
const ROOM_W = 9;
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
  ctx.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
  ctx.strokeStyle = "rgba(42, 37, 29, 0.25)";
  ctx.lineWidth = 3;
  ctx.strokeRect((W - w) / 2, (H - h) / 2, w, h);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
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

/** The module's name as a canvas texture — no font fetch, works offline. */
function TitlePlaque({ title, z }: { title: string; z: number }) {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = FRAME;
      ctx.font = "600 110px Georgia, serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(title, 512, 128, 960);
    }
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, [title]);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <mesh position={[0, 2.35, z]}>
      <planeGeometry args={[5.6, 1.4]} />
      <meshBasicMaterial map={texture} transparent toneMapped={false} />
    </mesh>
  );
}

interface SceneProps {
  items: PhotoItem[];
  textures: (THREE.CanvasTexture | null)[];
  title: string;
  accent: string;
  onNear: (index: number | null) => void;
}

function Scene({ items, textures, title, accent, onNear }: SceneProps) {
  const profile = useApp((s) => s.profile);
  const keys = useKeys();
  const player = useRef<THREE.Group>(null);
  const heading = useRef(Math.PI);
  const nearRef = useRef<number | null>(null);
  const [moving, setMoving] = useState(false);

  const length = roomLength(items.length);

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
    const desired = new THREE.Vector3(
      group.position.x * 0.72,
      group.position.y + 2.3,
      group.position.z + 4.1,
    );
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
      <color attach="background" args={[WALL]} />
      <fog attach="fog" args={[WALL, 10, 30]} />
      <hemisphereLight args={["#fff6e4", "#8a7a62", 0.85]} />
      <directionalLight position={[3, 8, 2]} intensity={1.4} color="#fff2dd" />
      <directionalLight position={[-4, 5, -6]} intensity={0.5} color="#dfe8ff" />

      {/* floor + rug */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -length / 2 + 3]}>
        <planeGeometry args={[ROOM_W, length + 8]} />
        <meshStandardMaterial color={FLOOR} roughness={0.95} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, -length / 2 + 3]}>
        <planeGeometry args={[2.4, length + 4]} />
        <meshStandardMaterial color={accent} roughness={0.95} />
      </mesh>

      {/* walls */}
      <mesh position={[-ROOM_W / 2, 2.1, -length / 2 + 3]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[length + 8, 4.2]} />
        <meshStandardMaterial color={WALL} roughness={1} />
      </mesh>
      <mesh position={[ROOM_W / 2, 2.1, -length / 2 + 3]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[length + 8, 4.2]} />
        <meshStandardMaterial color={WALL} roughness={1} />
      </mesh>
      <mesh position={[0, 2.1, -length]} rotation={[0, 0, 0]}>
        <planeGeometry args={[ROOM_W, 4.2]} />
        <meshStandardMaterial color={WALL} roughness={1} />
      </mesh>
      <mesh position={[0, 2.1, 3.4]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[ROOM_W, 4.2]} />
        <meshStandardMaterial color={WALL} roughness={1} />
      </mesh>

      {/* baseboards */}
      <mesh position={[-ROOM_W / 2 + 0.03, 0.09, -length / 2 + 3]}>
        <boxGeometry args={[0.06, 0.18, length + 8]} />
        <meshStandardMaterial color={FRAME} roughness={0.8} />
      </mesh>
      <mesh position={[ROOM_W / 2 - 0.03, 0.09, -length / 2 + 3]}>
        <boxGeometry args={[0.06, 0.18, length + 8]} />
        <meshStandardMaterial color={FRAME} roughness={0.8} />
      </mesh>

      {/* the module's name, painted on the end wall */}
      <TitlePlaque title={title} z={-length + 0.05} />

      {/* artworks */}
      {items.map((item, i) => {
        const slot = artSlot(i);
        const texture = textures[i];
        return (
          <group key={item.id} position={[slot.x, 1.7, slot.z]} rotation={[0, slot.rotY, 0]}>
            <mesh position={[0, 0, -0.04]}>
              <boxGeometry args={[1.46, 1.18, 0.07]} />
              <meshStandardMaterial color={FRAME} roughness={0.6} />
            </mesh>
            {texture ? (
              <mesh position={[0, 0, 0.002]}>
                <planeGeometry args={[1.34, 1.05]} />
                <meshBasicMaterial map={texture} toneMapped={false} />
              </mesh>
            ) : (
              <mesh position={[0, 0, 0.002]}>
                <planeGeometry args={[1.34, 1.05]} />
                <meshStandardMaterial color={MATTE} />
              </mesh>
            )}
          </group>
        );
      })}

      {/* the visitor */}
      {profile && (
        <group ref={player} position={[0, 0, 1.6]} rotation={[0, Math.PI, 0]}>
          <Avatar doc={profile.avatar} moving={moving} />
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
            <circleGeometry args={[0.42, 12]} />
            <meshBasicMaterial color="#2a251d" transparent opacity={0.14} />
          </mesh>
        </group>
      )}
    </>
  );
}

export function GalleryPage({ moduleId }: { moduleId: string }) {
  const profile = useApp((s) => s.profile);
  const setScreen = useApp((s) => s.setScreen);
  const module = profile?.modules.find(
    (m): m is PhotosModule => m.id === moduleId && m.kind === "photos",
  );

  const items = useMemo(() => module?.items.slice(0, 16) ?? [], [module]);
  const [textures, setTextures] = useState<(THREE.CanvasTexture | null)[]>([]);
  const [near, setNear] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all(items.map((item) => artTexture(item.src).catch(() => null))).then((loaded) => {
      if (!cancelled) setTextures(loaded);
    });
    return () => {
      cancelled = true;
      setTextures((old) => {
        for (const t of old) t?.dispose();
        return [];
      });
    };
  }, [items]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setScreen({ name: "profile" });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setScreen]);

  const missing = !profile || !module;
  useEffect(() => {
    if (missing) setScreen({ name: "profile" });
  }, [missing, setScreen]);
  if (missing) return null;

  const caption = near !== null ? (items[near]?.caption ?? `Untitled ${near + 1}`) : null;
  const total = module.items.length;

  return (
    <div className="gallery">
      <Canvas camera={{ fov: 48, position: [0, 2.3, 6] }} dpr={[1, 1.75]}>
        <Scene
          items={items}
          textures={textures}
          title={module.title}
          accent={profile.avatar.top}
          onNear={setNear}
        />
      </Canvas>
      <div className="gallery-ui">
        <button
          type="button"
          className="btn small gallery-back"
          onClick={() => setScreen({ name: "profile" })}
        >
          ← Back to page
        </button>
        <div className="gallery-hint">
          walk with WASD or arrows · esc to leave
          {total > items.length ? ` · showing first ${items.length} of ${total}` : ""}
        </div>
        {caption && <div className="gallery-caption">{caption}</div>}
      </div>
    </div>
  );
}
