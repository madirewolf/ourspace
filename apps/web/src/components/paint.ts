import * as THREE from "three";
import { createRng, type Rng } from "@ourspace/core";

/**
 * Small helpers for painting procedural textures on 2D canvases at mount —
 * seeded, so a room looks identical on every visit, and asset-free.
 */

/**
 * CPU-backed on purpose. A GPU canvas defers its raster work, and the deferred
 * work then lands all at once on whatever forces a sync — the texture upload or
 * tearing down the previous screen's WebGL context — measured at ~1.4 s
 * entering the rave, versus ~0.3 s painting and uploading from the CPU.
 */
export function makeCanvas(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("no 2d context");
  return { canvas, context };
}

export function finish(canvas: HTMLCanvasElement, wrap = true): THREE.CanvasTexture {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  if (wrap) texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

const GRAIN_TILE = 512;
/**
 * The strongest grain any texture asks for. Tiles hold shifts for this amount
 * (at most ±8) and weaker grain scales them down. Keeping tile values small
 * matters: `difference` only subtracts while the pixel is brighter than them.
 */
const GRAIN_MAX = 16;
let grainTiles: { lift: HTMLCanvasElement; sink: HTMLCanvasElement } | null = null;

/**
 * Two seeded noise tiles, built once: `lift` holds the positive half of each
 * pixel's shift, `sink` the negative half.
 */
function tiles() {
  if (grainTiles) return grainTiles;
  const rng = createRng("atrium-grain");
  const lift = makeCanvas(GRAIN_TILE, GRAIN_TILE);
  const sink = makeCanvas(GRAIN_TILE, GRAIN_TILE);
  const up = lift.context.createImageData(GRAIN_TILE, GRAIN_TILE);
  const down = sink.context.createImageData(GRAIN_TILE, GRAIN_TILE);
  for (let index = 0; index < up.data.length; index += 4) {
    const shift = Math.round((rng() - 0.5) * GRAIN_MAX);
    const target = shift >= 0 ? up.data : down.data;
    const value = Math.abs(shift);
    target[index] = target[index + 1] = target[index + 2] = value;
    up.data[index + 3] = down.data[index + 3] = 255;
  }
  lift.context.putImageData(up, 0, 0);
  sink.context.putImageData(down, 0, 0);
  grainTiles = { lift: lift.canvas, sink: sink.canvas };
  return grainTiles;
}

/**
 * Additive per-pixel grain of ±amount/2, done as two pattern fills (add the
 * lift tile, subtract the sink tile) — several times cheaper than reading the
 * pixels back and shifting each one in script. Tiles seamlessly because the
 * noise has no structure; the rng only picks where the tile lands, so textures
 * sharing it never line up.
 */
export function grain(context: CanvasRenderingContext2D, rng: Rng, amount: number) {
  const { width, height } = context.canvas;
  const { lift, sink } = tiles();
  const offset = new DOMMatrix().translate(
    Math.floor(rng() * GRAIN_TILE),
    Math.floor(rng() * GRAIN_TILE),
  );
  context.save();
  context.setTransform(1, 0, 0, 1, 0, 0);
  // globalAlpha g scales the tile: lighter adds g·d, difference subtracts it.
  context.globalAlpha = Math.min(1, amount / GRAIN_MAX);
  for (const [tile, mode] of [
    [lift, "lighter"],
    [sink, "difference"],
  ] as const) {
    const pattern = context.createPattern(tile, "repeat");
    if (!pattern) continue;
    pattern.setTransform(offset);
    context.globalCompositeOperation = mode;
    context.fillStyle = pattern;
    context.fillRect(0, 0, width, height);
  }
  context.restore();
}

/** Draw at every wrapped offset the shape could overlap, so the tile has no seam. */
export function wrapped(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  reach: number,
  draw: (x: number, y: number) => void,
) {
  const { width, height } = context.canvas;
  for (const dx of [-width, 0, width]) {
    for (const dy of [-height, 0, height]) {
      const px = x + dx;
      const py = y + dy;
      if (px + reach < 0 || px - reach > width || py + reach < 0 || py - reach > height) continue;
      draw(px, py);
    }
  }
}
