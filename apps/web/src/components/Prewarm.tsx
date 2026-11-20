import { useLayoutEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

function texturesOf(material: THREE.Material): THREE.Texture[] {
  const found: THREE.Texture[] = [];
  for (const value of Object.values(material)) {
    if (value instanceof THREE.Texture) found.push(value);
  }
  return found;
}

/**
 * Compiles every shader program and uploads every texture the scene will ever
 * draw — including objects that are hidden or off-screen right now — before
 * the first frame, so a scene never freezes mid-animation while the GPU links
 * a program. Uses the parallel shader-compile extension when the browser has
 * it, keeping the main thread free while the programs build.
 *
 * Mount it as the last child of a `<Canvas frameloop="never">` and switch the
 * frameloop on from `onReady`. The light set must not change after warm-up
 * (light counts are part of every lit program's key), so scenes keep a fixed
 * set of lights and animate intensity instead of mounting lights on demand.
 */
export function Prewarm({
  onReady,
  onShown,
}: {
  onReady: () => void;
  /** Called once the first frame is actually on screen — fade the canvas in from here. */
  onShown?: () => void;
}) {
  const gl = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);
  const camera = useThree((state) => state.camera);
  const ready = useRef(onReady);
  ready.current = onReady;
  const shown = useRef(onShown);
  shown.current = onShown;
  // -1 until compiled, then counts rendered frames up to the second.
  const frames = useRef(-1);

  useFrame(() => {
    if (frames.current < 0 || frames.current >= 2) return;
    frames.current += 1;
    // Callbacks run before the frame renders: on the second, the first is drawn.
    if (frames.current === 2) shown.current?.();
  });

  useLayoutEffect(() => {
    let cancelled = false;
    let compiled: Promise<unknown>;
    try {
      compiled = gl.compileAsync(scene, camera);
    } catch {
      gl.compile(scene, camera);
      compiled = Promise.resolve();
    }
    const textures = new Set<THREE.Texture>();
    scene.traverse((object) => {
      const material = (object as THREE.Mesh).material;
      if (!material) return;
      for (const item of Array.isArray(material) ? material : [material]) {
        for (const texture of texturesOf(item)) textures.add(texture);
      }
    });
    for (const texture of textures) {
      // Textures still loading are uploaded by their own onLoad path.
      if (texture.image) gl.initTexture(texture);
    }
    compiled
      .catch(() => undefined)
      .then(() => {
        if (cancelled) return;
        frames.current = 0;
        ready.current();
      });
    return () => {
      cancelled = true;
    };
  }, [gl, scene, camera]);

  return null;
}
