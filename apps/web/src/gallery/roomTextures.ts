import * as THREE from "three";
import { createRng, randRange } from "@ourspace/core";
import { finish, grain, makeCanvas, wrapped } from "../components/paint";

/**
 * Procedural, seeded, tileable surface textures for the gallery room. Painted
 * on 2D canvases at mount — no image assets, identical on every visit.
 */

/** Soft limewash plaster: mottled warm white with faint trowel clouds. */
export function plasterTexture(): THREE.CanvasTexture {
  const size = 512;
  const { canvas, context } = makeCanvas(size, size);
  const rng = createRng("atrium-plaster");
  context.fillStyle = "#f4ecdc";
  context.fillRect(0, 0, size, size);
  for (let index = 0; index < 150; index++) {
    const x = rng() * size;
    const y = rng() * size;
    const radius = randRange(rng, 30, 130);
    const light = rng() > 0.45;
    const alpha = randRange(rng, 0.025, 0.06);
    const tone = light ? `rgba(255, 252, 244, ${alpha})` : `rgba(205, 178, 140, ${alpha})`;
    wrapped(context, x, y, radius, (px, py) => {
      const gradient = context.createRadialGradient(px, py, 0, px, py, radius);
      gradient.addColorStop(0, tone);
      gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
      context.fillStyle = gradient;
      context.fillRect(px - radius, py - radius, radius * 2, radius * 2);
    });
  }
  // Long, low-contrast trowel sweeps.
  context.lineCap = "round";
  for (let index = 0; index < 40; index++) {
    const x = rng() * size;
    const y = rng() * size;
    const length = randRange(rng, 40, 140);
    const angle = randRange(rng, -0.5, 0.5);
    context.strokeStyle = `rgba(178, 150, 112, ${randRange(rng, 0.018, 0.035)})`;
    context.lineWidth = randRange(rng, 6, 18);
    wrapped(context, x, y, length, (px, py) => {
      context.beginPath();
      context.moveTo(px, py);
      context.lineTo(px + Math.cos(angle) * length, py + Math.sin(angle) * length);
      context.stroke();
    });
  }
  grain(context, rng, 7);
  return finish(canvas);
}

const OAK = ["#ab8158", "#9e764e", "#b48b62", "#957049", "#a77d56", "#a07851"];

/** Oak plank floor, eight planks across, staggered butt joints, grain and knots. */
export function woodTexture(): THREE.CanvasTexture {
  const size = 1024;
  const planks = 8;
  const plankWidth = size / planks;
  const { canvas, context } = makeCanvas(size, size);
  const rng = createRng("atrium-oak");
  for (let column = 0; column < planks; column++) {
    const x0 = column * plankWidth;
    // One or two boards per column; their lengths sum to the tile so it wraps.
    const count = rng() > 0.4 ? 1 : 2;
    const weights = Array.from({ length: count }, () => randRange(rng, 0.7, 1.3));
    const total = weights.reduce((sum, weight) => sum + weight, 0);
    let start = rng() * size;
    for (const weight of weights) {
      const length = (size * weight) / total;
      const color = new THREE.Color(OAK[Math.floor(rng() * OAK.length)]);
      color.offsetHSL(0, randRange(rng, -0.03, 0.03), randRange(rng, -0.035, 0.035));
      const lines = Array.from({ length: 16 }, () => ({
        x: x0 + 6 + rng() * (plankWidth - 12),
        sway: randRange(rng, 2, 9),
        phase: rng() * Math.PI * 2,
        alpha: randRange(rng, 0.06, 0.16),
        width: randRange(rng, 0.8, 2.2),
      }));
      const knot =
        rng() > 0.7
          ? {
              x: x0 + randRange(rng, 20, plankWidth - 20),
              y: randRange(rng, 40, length - 40),
              rx: randRange(rng, 4, 8),
              ry: randRange(rng, 10, 18),
            }
          : null;
      for (const offset of [0, -size]) {
        const top = start + offset;
        if (top + length < 0 || top > size) continue;
        context.save();
        context.beginPath();
        context.rect(x0, top, plankWidth, length);
        context.clip();
        context.fillStyle = `#${color.getHexString()}`;
        context.fillRect(x0, top, plankWidth, length);
        for (const line of lines) {
          context.strokeStyle = `rgba(74, 46, 22, ${line.alpha})`;
          context.lineWidth = line.width;
          context.beginPath();
          for (let step = 0; step <= 24; step++) {
            const py = top + (length * step) / 24;
            const px = line.x + Math.sin(line.phase + step * 0.45) * line.sway;
            if (step === 0) context.moveTo(px, py);
            else context.lineTo(px, py);
          }
          context.stroke();
        }
        if (knot) {
          context.fillStyle = "rgba(70, 40, 18, 0.32)";
          context.beginPath();
          context.ellipse(knot.x, top + knot.y, knot.rx, knot.ry, 0, 0, Math.PI * 2);
          context.fill();
        }
        // Butt joint and a sliver of bevel light.
        context.fillStyle = "rgba(48, 30, 16, 0.55)";
        context.fillRect(x0, top, plankWidth, 3);
        context.fillStyle = "rgba(255, 236, 205, 0.12)";
        context.fillRect(x0, top + 3, plankWidth, 2);
        context.restore();
      }
      start += length;
    }
    // Long seams between planks.
    context.fillStyle = "rgba(46, 28, 14, 0.6)";
    context.fillRect(x0, 0, 3, size);
    context.fillStyle = "rgba(255, 236, 205, 0.1)";
    context.fillRect(x0 + 3, 0, 2, size);
  }
  grain(context, rng, 10);
  return finish(canvas);
}

/** Flat-woven runner in the owner's colour: banded borders and a lozenge field. */
export function runnerTexture(accent: string): THREE.CanvasTexture {
  const width = 256;
  const height = 512;
  const { canvas, context } = makeCanvas(width, height);
  const rng = createRng(`atrium-runner-${accent}`);
  const base = new THREE.Color(accent);
  const shade = (lightness: number, saturation = 0) =>
    `#${base.clone().offsetHSL(0, saturation, lightness).getHexString()}`;
  const cream = "#efe3cc";
  const deep = shade(-0.2, -0.05);

  context.fillStyle = shade(-0.04);
  context.fillRect(0, 0, width, height);

  // Borders, mirrored on both edges.
  const bands: Array<[number, string]> = [
    [20, deep],
    [6, cream],
    [10, shade(0.08)],
    [4, deep],
  ];
  let inset = 0;
  for (const [band, color] of bands) {
    context.fillStyle = color;
    context.fillRect(inset, 0, band, height);
    context.fillRect(width - inset - band, 0, band, height);
    inset += band;
  }
  // Saw-tooth edging inside the border.
  context.fillStyle = cream;
  for (let y = 0; y < height; y += 16) {
    for (const side of [inset, width - inset]) {
      const direction = side === inset ? 1 : -1;
      context.beginPath();
      context.moveTo(side, y);
      context.lineTo(side + direction * 8, y + 8);
      context.lineTo(side, y + 16);
      context.fill();
    }
  }
  // Lozenge medallions down the field.
  const cx = width / 2;
  for (let y = 64; y < height; y += 128) {
    for (const [rx, ry, color] of [
      [58, 56, deep],
      [46, 44, cream],
      [36, 34, shade(0.1)],
      [18, 17, deep],
      [8, 8, cream],
    ] as Array<[number, number, string]>) {
      context.fillStyle = color;
      context.beginPath();
      context.moveTo(cx, y - ry);
      context.lineTo(cx + rx, y);
      context.lineTo(cx, y + ry);
      context.lineTo(cx - rx, y);
      context.closePath();
      context.fill();
    }
    // Small diamonds between medallions.
    context.fillStyle = shade(0.12);
    for (const dx of [-54, 54]) {
      context.beginPath();
      context.moveTo(cx + dx, y + 64 - 10);
      context.lineTo(cx + dx + 8, y + 64);
      context.lineTo(cx + dx, y + 64 + 10);
      context.lineTo(cx + dx - 8, y + 64);
      context.fill();
    }
  }
  // Weft lines and wool fuzz.
  for (let y = 0; y < height; y += 3) {
    context.fillStyle = `rgba(0, 0, 0, ${randRange(rng, 0.03, 0.08)})`;
    context.fillRect(0, y, width, 1);
  }
  grain(context, rng, 16);
  return finish(canvas);
}

/**
 * Sage wainscot panelling (two raised panels per tile, 2 m × 1 m) — a quiet
 * nod to vert menthe. Shading is baked: light from above-left.
 */
export function wainscotTexture(): THREE.CanvasTexture {
  const width = 512;
  const height = 256;
  const { canvas, context } = makeCanvas(width, height);
  const rng = createRng("atrium-wainscot");
  context.fillStyle = "#8a9a84";
  context.fillRect(0, 0, width, height);
  // Vertical brush drag in the paint.
  for (let index = 0; index < 220; index++) {
    context.fillStyle = `rgba(${rng() > 0.5 ? "255,255,240" : "40,52,38"}, ${randRange(rng, 0.015, 0.04)})`;
    context.fillRect(rng() * width, 0, randRange(rng, 1, 4), height);
  }
  const panel = (x: number, y: number, w: number, h: number) => {
    const bevel = 9;
    // Recess shadow (bottom/right) and highlight (top/left).
    context.fillStyle = "rgba(255, 255, 238, 0.22)";
    context.fillRect(x, y, w, 3);
    context.fillRect(x, y, 3, h);
    context.fillStyle = "rgba(28, 38, 26, 0.32)";
    context.fillRect(x, y + h - 3, w, 3);
    context.fillRect(x + w - 3, y, 3, h);
    // Raised field: bevelled edges then a flat face.
    const inner = {
      x: x + bevel + 4,
      y: y + bevel + 4,
      w: w - (bevel + 4) * 2,
      h: h - (bevel + 4) * 2,
    };
    context.fillStyle = "rgba(28, 38, 26, 0.18)";
    context.fillRect(inner.x - bevel, inner.y + inner.h, inner.w + bevel * 2, bevel);
    context.fillRect(inner.x + inner.w, inner.y - bevel, bevel, inner.h + bevel * 2);
    context.fillStyle = "rgba(255, 255, 238, 0.14)";
    context.fillRect(inner.x - bevel, inner.y - bevel, inner.w + bevel * 2, bevel);
    context.fillRect(inner.x - bevel, inner.y - bevel, bevel, inner.h + bevel * 2);
    context.fillStyle = "rgba(255, 255, 240, 0.05)";
    context.fillRect(inner.x, inner.y, inner.w, inner.h);
  };
  panel(22, 34, 212, 172);
  panel(278, 34, 212, 172);
  // Shadow under the dado rail, and contact darkening above the skirting.
  const top = context.createLinearGradient(0, 0, 0, 30);
  top.addColorStop(0, "rgba(20, 26, 18, 0.35)");
  top.addColorStop(1, "rgba(20, 26, 18, 0)");
  context.fillStyle = top;
  context.fillRect(0, 0, width, 30);
  const bottom = context.createLinearGradient(0, height - 46, 0, height);
  bottom.addColorStop(0, "rgba(20, 26, 18, 0)");
  bottom.addColorStop(1, "rgba(20, 26, 18, 0.3)");
  context.fillStyle = bottom;
  context.fillRect(0, height - 46, width, 46);
  grain(context, rng, 8);
  const texture = finish(canvas);
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

/** Skylight glazing: 2 × 2 warm-white panes in dark steel mullions. */
export function skylightTexture(): THREE.CanvasTexture {
  const size = 256;
  const { canvas, context } = makeCanvas(size, size);
  context.fillStyle = "#3a3129";
  context.fillRect(0, 0, size, size);
  const pane = (x: number, y: number, w: number, h: number) => {
    const gradient = context.createLinearGradient(x, y, x + w, y + h);
    gradient.addColorStop(0, "#fffdf7");
    gradient.addColorStop(0.55, "#fbf3e3");
    gradient.addColorStop(1, "#efe2c8");
    context.fillStyle = gradient;
    context.fillRect(x, y, w, h);
    context.fillStyle = "rgba(255, 255, 255, 0.35)";
    context.beginPath();
    context.moveTo(x + w * 0.15, y + h);
    context.lineTo(x + w * 0.42, y + h);
    context.lineTo(x + w * 0.85, y);
    context.lineTo(x + w * 0.58, y);
    context.fill();
  };
  pane(7, 7, 114, 114);
  pane(135, 7, 114, 114);
  pane(7, 135, 114, 114);
  pane(135, 135, 114, 114);
  return finish(canvas);
}

/** Lamp wash: bright just under the picture light, fading down the wall. */
export function washTexture(): THREE.CanvasTexture {
  const { canvas, context } = makeCanvas(128, 256);
  // An ellipse that dies out before every edge, so the quad never shows.
  context.save();
  context.translate(64, 34);
  context.scale(1, 3.4);
  const gradient = context.createRadialGradient(0, 0, 0, 0, 0, 62);
  gradient.addColorStop(0, "rgba(255,255,255,0.95)");
  gradient.addColorStop(0.3, "rgba(255,255,255,0.5)");
  gradient.addColorStop(0.65, "rgba(255,255,255,0.14)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  context.fillStyle = gradient;
  context.fillRect(-64, -34 / 3.4, 128, 256 / 3.4);
  context.restore();
  // Nothing above the lamp hood.
  context.globalCompositeOperation = "destination-in";
  // (destination-in clears whatever the fill doesn't cover, so cover it all.)
  const cut = context.createLinearGradient(0, 0, 0, 256);
  cut.addColorStop(0, "rgba(0,0,0,0)");
  cut.addColorStop(26 / 256, "rgba(0,0,0,1)");
  cut.addColorStop(1, "rgba(0,0,0,1)");
  context.fillStyle = cut;
  context.fillRect(0, 0, 128, 256);
  context.globalCompositeOperation = "source-over";
  return finish(canvas, false);
}

/** Corner occlusion: opaque at the top edge (v = 1), clear at the bottom. */
export function occlusionTexture(): THREE.CanvasTexture {
  const { canvas, context } = makeCanvas(4, 128);
  const gradient = context.createLinearGradient(0, 0, 0, 128);
  gradient.addColorStop(0, "rgba(0,0,0,1)");
  gradient.addColorStop(0.3, "rgba(0,0,0,0.45)");
  gradient.addColorStop(1, "rgba(0,0,0,0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 4, 128);
  return finish(canvas, false);
}
