import * as THREE from "three";
import { createRng, pick, randInt, randRange } from "@ourspace/core";
import { finish, grain, makeCanvas, wrapped } from "../components/paint";

/**
 * Procedural, seeded surfaces for the rave room: a basement club with old
 * oxblood brick, acoustic foam, an LED wall and wheat-pasted gig posters.
 * Everything is painted on canvases at mount — no image assets.
 */

const BRICKS = ["#5c302a", "#512a25", "#66372d", "#48251f", "#58322b", "#432421", "#6d3d31"];

/** Old oxblood brick in running bond, plus a matching bump map for relief. */
export function brickTextures(): { map: THREE.CanvasTexture; bump: THREE.CanvasTexture } {
  const size = 512;
  const columns = 4;
  const rows = 8;
  const brickW = size / columns;
  const course = size / rows;
  const mortar = 8;
  const color = makeCanvas(size, size);
  const relief = makeCanvas(size, size);
  const rng = createRng("rave-brick");
  const c = color.context;
  const r = relief.context;

  c.fillStyle = "#1f1619";
  c.fillRect(0, 0, size, size);
  r.fillStyle = "#000";
  r.fillRect(0, 0, size, size);
  // Gritty mortar.
  for (let index = 0; index < 2600; index++) {
    const light = rng() > 0.5;
    c.fillStyle = light ? "rgba(92, 78, 82, 0.35)" : "rgba(6, 4, 6, 0.4)";
    c.fillRect(rng() * size, rng() * size, randRange(rng, 1, 3), randRange(rng, 1, 3));
  }

  for (let row = 0; row < rows; row++) {
    const offset = row % 2 ? brickW / 2 : 0;
    for (let column = 0; column < columns; column++) {
      const w = brickW - mortar - randRange(rng, 0, 3);
      const h = course - mortar - randRange(rng, 0, 2);
      const x0 = column * brickW + offset + mortar / 2;
      const y0 = row * course + mortar / 2;
      const base = pick(rng, BRICKS);
      const soot = rng() < 0.18 ? randRange(rng, 0.12, 0.32) : 0;
      const speckles = Array.from({ length: 34 }, () => ({
        x: rng() * w,
        y: rng() * h,
        s: randRange(rng, 1, 2.6),
        light: rng() > 0.55,
      }));
      const chips = Array.from({ length: randInt(rng, 0, 3) }, () => ({
        x: rng() > 0.5 ? 0 : w - 6,
        y: rng() * (h - 6),
        w: randRange(rng, 3, 9),
        h: randRange(rng, 3, 7),
      }));
      wrapped(c, x0 + w / 2, y0 + h / 2, w, (cx, cy) => {
        const x = cx - w / 2;
        const y = cy - h / 2;
        c.fillStyle = base;
        c.fillRect(x, y, w, h);
        const shade = c.createLinearGradient(0, y, 0, y + h);
        shade.addColorStop(0, "rgba(255, 214, 196, 0.1)");
        shade.addColorStop(0.5, "rgba(0, 0, 0, 0)");
        shade.addColorStop(1, "rgba(0, 0, 0, 0.22)");
        c.fillStyle = shade;
        c.fillRect(x, y, w, h);
        for (const dot of speckles) {
          c.fillStyle = dot.light ? "rgba(255, 210, 190, 0.12)" : "rgba(10, 4, 6, 0.28)";
          c.fillRect(x + dot.x, y + dot.y, dot.s, dot.s);
        }
        if (soot) {
          c.fillStyle = `rgba(14, 8, 14, ${soot})`;
          c.fillRect(x, y, w, h);
        }
        // Lit top arris, shadowed underside.
        c.fillStyle = "rgba(255, 220, 200, 0.14)";
        c.fillRect(x, y, w, 2);
        c.fillStyle = "rgba(0, 0, 0, 0.32)";
        c.fillRect(x, y + h - 3, w, 3);
        c.fillRect(x + w - 2, y, 2, h);
        for (const chip of chips) {
          c.fillStyle = "rgba(24, 14, 16, 0.75)";
          c.fillRect(x + chip.x, y + chip.y, chip.w, chip.h);
        }

        r.fillStyle = "#cfcfcf";
        r.fillRect(x, y, w, h);
        r.fillStyle = "#fff";
        r.fillRect(x + 3, y + 3, w - 6, h - 6);
        for (const chip of chips) {
          r.fillStyle = "#555";
          r.fillRect(x + chip.x, y + chip.y, chip.w, chip.h);
        }
      });
    }
  }
  // Big soft soot clouds so the tiling never reads as a pattern.
  for (let index = 0; index < 26; index++) {
    const x = rng() * size;
    const y = rng() * size;
    const radius = randRange(rng, 60, 180);
    const tone = rng() > 0.6 ? "rgba(120, 70, 90, 0.07)" : "rgba(8, 4, 10, 0.16)";
    wrapped(c, x, y, radius, (px, py) => {
      const gradient = c.createRadialGradient(px, py, 0, px, py, radius);
      gradient.addColorStop(0, tone);
      gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
      c.fillStyle = gradient;
      c.fillRect(px - radius, py - radius, radius * 2, radius * 2);
    });
  }
  grain(c, rng, 12);
  const bump = finish(relief.canvas);
  bump.colorSpace = THREE.NoColorSpace;
  return { map: finish(color.canvas), bump };
}

/** Wedge acoustic foam: flat-shaded pyramids, one light from above. */
export function foamTexture(): THREE.CanvasTexture {
  const size = 256;
  const cells = 4;
  const cell = size / cells;
  const { canvas, context } = makeCanvas(size, size);
  const rng = createRng("rave-foam");
  const faces = ["#6b5a82", "#4a3d5c", "#382c46", "#211a2b"]; // top, left, right, bottom
  for (let row = 0; row < cells; row++) {
    for (let column = 0; column < cells; column++) {
      const x = column * cell;
      const y = row * cell;
      const cx = x + cell / 2;
      const cy = y + cell / 2;
      const corners: Array<[number, number]> = [
        [x, y],
        [x + cell, y],
        [x + cell, y + cell],
        [x, y + cell],
      ];
      // top, right, bottom, left triangles
      const order = [0, 2, 3, 1];
      for (let side = 0; side < 4; side++) {
        const a = corners[side] ?? [0, 0];
        const b = corners[(side + 1) % 4] ?? [0, 0];
        context.fillStyle = faces[order[side] ?? 0] ?? "#000";
        context.beginPath();
        context.moveTo(a[0], a[1]);
        context.lineTo(b[0], b[1]);
        context.lineTo(cx, cy);
        context.closePath();
        context.fill();
      }
    }
  }
  grain(context, rng, 10);
  return finish(canvas);
}

/** Polished black concrete with soft mottling and saw-cut joints at the tile edge. */
export function concreteTexture(): THREE.CanvasTexture {
  const size = 512;
  const { canvas, context } = makeCanvas(size, size);
  const rng = createRng("rave-concrete");
  context.fillStyle = "#1d1822";
  context.fillRect(0, 0, size, size);
  for (let index = 0; index < 110; index++) {
    const x = rng() * size;
    const y = rng() * size;
    const radius = randRange(rng, 30, 150);
    const tone =
      rng() > 0.5
        ? `rgba(90, 76, 104, ${randRange(rng, 0.04, 0.09)})`
        : `rgba(0, 0, 0, ${randRange(rng, 0.08, 0.16)})`;
    wrapped(context, x, y, radius, (px, py) => {
      const gradient = context.createRadialGradient(px, py, 0, px, py, radius);
      gradient.addColorStop(0, tone);
      gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
      context.fillStyle = gradient;
      context.fillRect(px - radius, py - radius, radius * 2, radius * 2);
    });
  }
  // Scuffs from a thousand nights of dancing.
  context.lineCap = "round";
  for (let index = 0; index < 90; index++) {
    const x = rng() * size;
    const y = rng() * size;
    const length = randRange(rng, 8, 40);
    const angle = rng() * Math.PI * 2;
    context.strokeStyle = `rgba(200, 180, 220, ${randRange(rng, 0.03, 0.07)})`;
    context.lineWidth = randRange(rng, 1, 2.5);
    wrapped(context, x, y, length, (px, py) => {
      context.beginPath();
      context.moveTo(px, py);
      context.lineTo(px + Math.cos(angle) * length, py + Math.sin(angle) * length);
      context.stroke();
    });
  }
  context.fillStyle = "rgba(0, 0, 0, 0.55)";
  context.fillRect(0, 0, size, 3);
  context.fillRect(0, 0, 3, size);
  context.fillStyle = "rgba(150, 130, 170, 0.08)";
  context.fillRect(0, 3, size, 1);
  context.fillRect(3, 0, 1, size);
  grain(context, rng, 10);
  return finish(canvas);
}

/** One LED dance-floor tile: a frosted square, bright in the middle. Drawn additively. */
export function tileGlowTexture(): THREE.CanvasTexture {
  const size = 64;
  const { canvas, context } = makeCanvas(size, size);
  context.fillStyle = "#000";
  context.fillRect(0, 0, size, size);
  const gradient = context.createRadialGradient(32, 32, 2, 32, 32, 40);
  gradient.addColorStop(0, "#fff");
  gradient.addColorStop(0.6, "#9a9a9a");
  gradient.addColorStop(1, "#5a5a5a");
  context.fillStyle = gradient;
  context.beginPath();
  context.roundRect(5, 5, size - 10, size - 10, 7);
  context.fill();
  context.strokeStyle = "rgba(255, 255, 255, 0.85)";
  context.lineWidth = 1.5;
  context.stroke();
  return finish(canvas, false);
}

/** Light-beam falloff: white at the lens (top, v = 1), gone by the floor. */
export function beamTexture(): THREE.CanvasTexture {
  const { canvas, context } = makeCanvas(8, 256);
  const gradient = context.createLinearGradient(0, 0, 0, 256);
  gradient.addColorStop(0, "#fff");
  gradient.addColorStop(0.12, "#9a9a9a");
  gradient.addColorStop(0.5, "#333");
  gradient.addColorStop(1, "#000");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 8, 256);
  return finish(canvas, false);
}

/** Wall wash under a neon line: bright at the top edge, gone at the bottom. */
export function neonWashTexture(): THREE.CanvasTexture {
  const { canvas, context } = makeCanvas(8, 128);
  const gradient = context.createLinearGradient(0, 0, 0, 128);
  gradient.addColorStop(0, "#fff");
  gradient.addColorStop(0.18, "#7a7a7a");
  gradient.addColorStop(0.55, "#1c1c1c");
  gradient.addColorStop(1, "#000");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 8, 128);
  return finish(canvas, false);
}

const LED_PINK = new THREE.Color("#ff3dcc");
const LED_VIOLET = new THREE.Color("#9b6bff");
const LED_CYAN = new THREE.Color("#3dffd8");

/** Pink → violet → cyan across the wall, the room's signature gradient. */
export function ledGradient(t: number, target = new THREE.Color()): THREE.Color {
  return t < 0.5
    ? target.copy(LED_PINK).lerp(LED_VIOLET, t * 2)
    : target.copy(LED_VIOLET).lerp(LED_CYAN, (t - 0.5) * 2);
}

export const LED_COLUMNS = 128;
export const LED_ROWS = 58;
/** Dot rows the lettered title occupies, from the top of the wall. */
export const LED_TITLE_ROWS = 24;

/**
 * The LED wall behind the booth: a field of dim diodes on cabinet seams, with
 * the module title lit in dot-matrix across the top. The equaliser is drawn
 * live in front of the lower half.
 */
export function ledWallTexture(title: string): THREE.CanvasTexture {
  const pitch = 8;
  const width = LED_COLUMNS * pitch;
  const height = LED_ROWS * pitch;
  const { canvas, context } = makeCanvas(width, height);
  context.fillStyle = "#06040b";
  context.fillRect(0, 0, width, height);
  // Cabinet seams every 16 diodes.
  context.fillStyle = "#000";
  for (let x = 0; x <= width; x += pitch * 16) context.fillRect(x - 1, 0, 2, height);
  for (let y = 0; y <= height; y += pitch * 16) context.fillRect(0, y - 1, width, 2);

  // Rasterise the title at diode resolution.
  const text = makeCanvas(LED_COLUMNS, LED_TITLE_ROWS);
  const label = title.trim().toUpperCase() || "LIVE";
  let fontSize = 17;
  text.context.font = `900 ${fontSize}px Arial, Helvetica, sans-serif`;
  const measured = text.context.measureText(label).width;
  if (measured > LED_COLUMNS - 8) {
    fontSize = Math.max(8, Math.floor((fontSize * (LED_COLUMNS - 8)) / measured));
    text.context.font = `900 ${fontSize}px Arial, Helvetica, sans-serif`;
  }
  text.context.fillStyle = "#fff";
  text.context.textAlign = "center";
  text.context.textBaseline = "middle";
  text.context.fillText(label, LED_COLUMNS / 2, LED_TITLE_ROWS / 2 + 1);
  const pixels = text.context.getImageData(0, 0, LED_COLUMNS, LED_TITLE_ROWS).data;

  const lit = (column: number, row: number) =>
    row < LED_TITLE_ROWS && (pixels[(row * LED_COLUMNS + column) * 4 + 3] ?? 0) > 110;
  const color = new THREE.Color();
  // Halo pass first so neighbouring diodes don't paint over each other's glow.
  for (let row = 0; row < LED_ROWS; row++) {
    for (let column = 0; column < LED_COLUMNS; column++) {
      if (!lit(column, row)) continue;
      ledGradient(column / (LED_COLUMNS - 1), color);
      const x = column * pitch + pitch / 2;
      const y = row * pitch + pitch / 2;
      const halo = context.createRadialGradient(x, y, 0, x, y, pitch * 1.4);
      halo.addColorStop(0, `rgba(${color.r * 255}, ${color.g * 255}, ${color.b * 255}, 0.42)`);
      halo.addColorStop(1, "rgba(0, 0, 0, 0)");
      context.fillStyle = halo;
      context.fillRect(x - pitch * 1.4, y - pitch * 1.4, pitch * 2.8, pitch * 2.8);
    }
  }
  for (let row = 0; row < LED_ROWS; row++) {
    for (let column = 0; column < LED_COLUMNS; column++) {
      const x = column * pitch + pitch / 2;
      const y = row * pitch + pitch / 2;
      context.beginPath();
      if (lit(column, row)) {
        ledGradient(column / (LED_COLUMNS - 1), color);
        context.fillStyle = `#${color.getHexString()}`;
        context.arc(x, y, 3, 0, Math.PI * 2);
        context.fill();
        context.beginPath();
        context.fillStyle = "rgba(255, 255, 255, 0.55)";
        context.arc(x, y, 1.3, 0, Math.PI * 2);
      } else {
        context.fillStyle = "#1a1226";
        context.arc(x, y, 2.3, 0, Math.PI * 2);
      }
      context.fill();
    }
  }
  return finish(canvas, false);
}

function driver(
  c: CanvasRenderingContext2D,
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  rim: string,
) {
  // Surround
  const surround = c.createRadialGradient(x, y, radius * 0.78, x, y, radius);
  surround.addColorStop(0, "#0b0910");
  surround.addColorStop(0.5, "#2b2633");
  surround.addColorStop(1, "#0d0b12");
  c.fillStyle = surround;
  c.beginPath();
  c.arc(x, y, radius, 0, Math.PI * 2);
  c.fill();
  // Cone with pressed rings
  const cone = c.createRadialGradient(x, y - radius * 0.2, radius * 0.1, x, y, radius * 0.8);
  cone.addColorStop(0, "#36313f");
  cone.addColorStop(1, "#141119");
  c.fillStyle = cone;
  c.beginPath();
  c.arc(x, y, radius * 0.8, 0, Math.PI * 2);
  c.fill();
  c.strokeStyle = "rgba(255, 255, 255, 0.05)";
  c.lineWidth = 1;
  for (let ring = 0.35; ring < 0.8; ring += 0.11) {
    c.beginPath();
    c.arc(x, y, radius * ring, 0, Math.PI * 2);
    c.stroke();
  }
  // Dust cap
  const cap = c.createRadialGradient(x - radius * 0.08, y - radius * 0.1, 1, x, y, radius * 0.26);
  cap.addColorStop(0, "#6b6475");
  cap.addColorStop(1, "#1d1923");
  c.fillStyle = cap;
  c.beginPath();
  c.arc(x, y, radius * 0.26, 0, Math.PI * 2);
  c.fill();
  // Neon rim, in colour and in the glow mask.
  for (const ctx of [c, g]) {
    ctx.strokeStyle = rim;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y, radius + 3, 0, Math.PI * 2);
    ctx.stroke();
  }
}

/**
 * Speaker fronts, two cells: sub (one big woofer) and top (horn over two
 * drivers). `glow` masks only the neon rims, for the emissive channel.
 */
export function speakerTextures(): { map: THREE.CanvasTexture; glow: THREE.CanvasTexture } {
  const width = 512;
  const height = 256;
  const color = makeCanvas(width, height);
  const mask = makeCanvas(width, height);
  const c = color.context;
  const g = mask.context;
  const rng = createRng("rave-speakers");
  g.fillStyle = "#000";
  g.fillRect(0, 0, width, height);
  for (const cellX of [0, 256]) {
    c.fillStyle = "#121016";
    c.fillRect(cellX, 0, 256, 256);
    // Perforated grille
    c.fillStyle = "#1e1a24";
    for (let y = 6; y < 256; y += 6) {
      for (let x = cellX + ((y / 6) % 2 ? 3 : 6); x < cellX + 256; x += 6) {
        c.fillRect(x, y, 2, 2);
      }
    }
    c.strokeStyle = "#2a2531";
    c.lineWidth = 6;
    c.strokeRect(cellX + 3, 3, 250, 250);
    for (const [bx, by] of [
      [14, 14],
      [242, 14],
      [14, 242],
      [242, 242],
    ] as const) {
      c.fillStyle = "#4a4452";
      c.beginPath();
      c.arc(cellX + bx, by, 4, 0, Math.PI * 2);
      c.fill();
    }
  }
  driver(c, g, 128, 128, 98, "#ff3dcc");
  // Horn
  c.fillStyle = "#0c0a10";
  c.beginPath();
  c.moveTo(256 + 34, 20);
  c.lineTo(256 + 222, 20);
  c.lineTo(256 + 168, 92);
  c.lineTo(256 + 88, 92);
  c.closePath();
  c.fill();
  c.strokeStyle = "rgba(255, 255, 255, 0.06)";
  c.lineWidth = 2;
  for (let line = 0; line < 6; line++) {
    const t = line / 5;
    c.beginPath();
    c.moveTo(256 + 34 + t * 54, 20 + t * 72);
    c.lineTo(256 + 222 - t * 54, 20 + t * 72);
    c.stroke();
  }
  c.fillStyle = "#050407";
  c.fillRect(256 + 112, 70, 32, 18);
  driver(c, g, 256 + 70, 172, 52, "#3dffd8");
  driver(c, g, 256 + 186, 172, 52, "#3dffd8");
  grain(c, rng, 6);
  const glow = finish(mask.canvas, false);
  return { map: finish(color.canvas, false), glow };
}

/** A spinning record: grooves, a run-out and a label in the owner's colour. */
export function recordTexture(accent: string, seed: string): THREE.CanvasTexture {
  const size = 256;
  const { canvas, context } = makeCanvas(size, size);
  const rng = createRng(`rave-record-${seed}`);
  context.fillStyle = "#000";
  context.fillRect(0, 0, size, size);
  context.fillStyle = "#0c0b0f";
  context.beginPath();
  context.arc(128, 128, 127, 0, Math.PI * 2);
  context.fill();
  for (let radius = 50; radius < 124; radius += randRange(rng, 1.6, 3.2)) {
    context.strokeStyle = `rgba(255, 255, 255, ${randRange(rng, 0.02, 0.07)})`;
    context.lineWidth = 1;
    context.beginPath();
    context.arc(128, 128, radius, 0, Math.PI * 2);
    context.stroke();
  }
  // A sheen wedge so the spin reads.
  context.fillStyle = "rgba(255, 255, 255, 0.08)";
  context.beginPath();
  context.moveTo(128, 128);
  context.arc(128, 128, 124, -0.5, -0.2);
  context.closePath();
  context.fill();
  context.fillStyle = accent;
  context.beginPath();
  context.arc(128, 128, 44, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "rgba(255, 255, 255, 0.35)";
  context.fillRect(100, 116, 56, 5);
  context.fillRect(108, 136, 40, 4);
  context.fillStyle = "#000";
  context.beginPath();
  context.arc(128, 128, 4, 0, Math.PI * 2);
  context.fill();
  const texture = finish(canvas, false);
  return texture;
}

function neonText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  font: string,
  color: string,
) {
  ctx.font = font;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = color;
  for (const blur of [34, 18, 8]) {
    ctx.shadowBlur = blur;
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
  }
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#ffe8f8";
  ctx.fillText(text, x, y);
}

/**
 * The booth's front panel: brushed black fascia, vents, a row of status LEDs,
 * and the DJ's handle in neon script. `glow` holds just the lit parts.
 */
export function consoleTextures(handle: string): {
  map: THREE.CanvasTexture;
  glow: THREE.CanvasTexture;
} {
  const width = 1024;
  const height = 240;
  const color = makeCanvas(width, height);
  const mask = makeCanvas(width, height);
  const c = color.context;
  const g = mask.context;
  const rng = createRng("rave-console");
  const fascia = c.createLinearGradient(0, 0, 0, height);
  fascia.addColorStop(0, "#221d2a");
  fascia.addColorStop(1, "#0f0c14");
  c.fillStyle = fascia;
  c.fillRect(0, 0, width, height);
  for (let line = 0; line < 220; line++) {
    c.fillStyle = `rgba(255, 255, 255, ${randRange(rng, 0.01, 0.035)})`;
    c.fillRect(0, rng() * height, width, 1);
  }
  c.fillStyle = "rgba(255, 255, 255, 0.1)";
  c.fillRect(0, 0, width, 3);
  // Vents at each end
  c.fillStyle = "#07060a";
  for (const left of [40, width - 190]) {
    for (let slot = 0; slot < 6; slot++) {
      c.beginPath();
      c.roundRect(left, 52 + slot * 24, 150, 9, 4);
      c.fill();
    }
  }
  g.fillStyle = "#000";
  g.fillRect(0, 0, width, height);
  const label = `@${handle}`;
  let size = 92;
  c.font = `italic 700 ${size}px Georgia, "Times New Roman", serif`;
  const measured = c.measureText(label).width;
  if (measured > 560) size = Math.floor((size * 560) / measured);
  const font = `italic 700 ${size}px Georgia, "Times New Roman", serif`;
  neonText(c, label, width / 2, height / 2 - 8, font, "#ff4fd0");
  neonText(g, label, width / 2, height / 2 - 8, font, "#ff4fd0");
  // Status LEDs along the foot
  for (let led = 0; led < 24; led++) {
    const x = width / 2 - 23 * 11 + led * 22;
    const tone = led % 3 === 0 ? "#3dffd8" : led % 3 === 1 ? "#9b6bff" : "#ff3dcc";
    for (const ctx of [c, g]) {
      ctx.fillStyle = tone;
      ctx.beginPath();
      ctx.arc(x, height - 26, 3.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  return { map: finish(color.canvas, false), glow: finish(mask.canvas, false) };
}

type PosterPainter = (ctx: CanvasRenderingContext2D, w: number, h: number) => void;

const DISPLAY = `900 {s}px "Arial Black", Impact, Arial, sans-serif`;
const display = (size: number) => DISPLAY.replace("{s}", String(size));

function fitText(
  ctx: CanvasRenderingContext2D,
  text: string,
  font: (size: number) => string,
  size: number,
  max: number,
) {
  ctx.font = font(size);
  const width = ctx.measureText(text).width;
  if (width > max) ctx.font = font(Math.floor((size * max) / width));
}

/**
 * Four wheat-pasted gig posters for the side walls, all advertising this
 * profile's own night. Cells are 256 × 360 side by side.
 */
export function posterAtlas(title: string, handle: string): THREE.CanvasTexture {
  const cellW = 256;
  const cellH = 360;
  const { canvas, context } = makeCanvas(cellW * 4, cellH);
  const rng = createRng(`rave-posters-${handle}`);
  const name = title.trim().toUpperCase() || "LIVE";
  const at = `@${handle}`;

  const painters: PosterPainter[] = [
    // Synth sunset
    (ctx, w, h) => {
      const sky = ctx.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, "#2b1450");
      sky.addColorStop(0.55, "#d8456a");
      sky.addColorStop(1, "#f6b25a");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, h);
      const sun = ctx.createLinearGradient(0, 120, 0, 260);
      sun.addColorStop(0, "#ffe27a");
      sun.addColorStop(1, "#ff5f8f");
      ctx.fillStyle = sun;
      ctx.beginPath();
      ctx.arc(w / 2, 200, 78, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#2b1450";
      for (let band = 0; band < 6; band++) ctx.fillRect(0, 206 + band * 12, w, 2 + band);
      ctx.fillStyle = "#fff4e2";
      ctx.textAlign = "center";
      fitText(ctx, "LIVE", display, 76, w - 30);
      ctx.fillText("LIVE", w / 2, 82);
      fitText(ctx, name, display, 30, w - 30);
      ctx.fillText(name, w / 2, 316);
      ctx.font = `700 16px "Courier New", monospace`;
      ctx.fillText(at, w / 2, 342);
    },
    // Midnight rings
    (ctx, w, h) => {
      ctx.fillStyle = "#15132e";
      ctx.fillRect(0, 0, w, h);
      ctx.lineWidth = 7;
      for (let ring = 0; ring < 9; ring++) {
        ctx.strokeStyle = ring % 2 ? "#ff3dcc" : "#3dffd8";
        ctx.beginPath();
        ctx.arc(w / 2, 150, 18 + ring * 14, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.fillStyle = "#f3eaff";
      ctx.textAlign = "center";
      ctx.font = display(40);
      ctx.fillText("ALL NIGHT", w / 2, 296);
      ctx.font = `italic 700 22px Georgia, serif`;
      ctx.fillText("long, with", w / 2, 324);
      ctx.font = `700 16px "Courier New", monospace`;
      ctx.fillText(at, w / 2, 348);
    },
    // Acid
    (ctx, w, h) => {
      ctx.fillStyle = "#c8ff3d";
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "#14120f";
      for (let y = 0; y < h; y += 14) {
        for (let x = (y / 14) % 2 ? 7 : 0; x < w; x += 14) {
          const radius = 1 + (y / h) * 4.5;
          ctx.beginPath();
          ctx.arc(x, y, radius, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.fillStyle = "#c8ff3d";
      ctx.fillRect(18, 40, w - 36, 120);
      ctx.fillStyle = "#14120f";
      ctx.textAlign = "center";
      ctx.font = display(96);
      ctx.fillText("B2B", w / 2, 136);
      ctx.fillStyle = "#c8ff3d";
      ctx.fillRect(18, 300, w - 36, 44);
      ctx.fillStyle = "#14120f";
      fitText(ctx, name, display, 26, w - 50);
      ctx.fillText(name, w / 2, 332);
    },
    // Warm sessions
    (ctx, w, h) => {
      ctx.fillStyle = "#efe3cc";
      ctx.fillRect(0, 0, w, h);
      const hills: Array<[string, number]> = [
        ["#d9895a", 210],
        ["#b4583c", 240],
        ["#7a3a2c", 268],
      ];
      for (const [tone, base] of hills) {
        ctx.fillStyle = tone;
        ctx.beginPath();
        ctx.moveTo(0, h);
        ctx.lineTo(0, base + randRange(rng, -10, 10));
        for (let x = 0; x <= w; x += 42) ctx.lineTo(x, base + randRange(rng, -34, 22));
        ctx.lineTo(w, h);
        ctx.closePath();
        ctx.fill();
      }
      ctx.fillStyle = "#e9a23b";
      ctx.beginPath();
      ctx.arc(176, 128, 30, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#3a2218";
      ctx.textAlign = "left";
      ctx.font = `italic 700 34px Georgia, serif`;
      ctx.fillText("ourspace", 22, 62);
      ctx.font = `italic 400 22px Georgia, serif`;
      ctx.fillText("sessions · vol. 03", 22, 92);
      ctx.fillStyle = "#efe3cc";
      ctx.font = `700 16px "Courier New", monospace`;
      ctx.fillText(at, 22, 338);
    },
  ];

  painters.forEach((paint, index) => {
    context.save();
    context.translate(index * cellW, 0);
    context.beginPath();
    context.rect(0, 0, cellW, cellH);
    context.clip();
    paint(context, cellW, cellH);
    // Paper: a fold, edge wear and a little sun-fade.
    context.fillStyle = "rgba(255, 255, 255, 0.12)";
    context.fillRect(0, cellH / 2, cellW, 1);
    context.fillStyle = "rgba(0, 0, 0, 0.1)";
    context.fillRect(0, cellH / 2 + 1, cellW, 1);
    const wear = context.createRadialGradient(
      cellW / 2,
      cellH / 2,
      cellH * 0.3,
      cellW / 2,
      cellH / 2,
      cellH * 0.72,
    );
    wear.addColorStop(0, "rgba(0, 0, 0, 0)");
    wear.addColorStop(1, "rgba(30, 18, 12, 0.32)");
    context.fillStyle = wear;
    context.fillRect(0, 0, cellW, cellH);
    context.restore();
  });
  grain(context, rng, 16);
  return finish(canvas, false);
}
