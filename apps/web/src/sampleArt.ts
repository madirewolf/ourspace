import { createRng, pick, randInt, randRange, type Rng } from "@ourspace/core";

/**
 * Seeded abstract art so a brand-new profile (and its gallery) never looks
 * empty. Same seed, same piece — the parameters-not-meshes idea, applied to
 * placeholder paintings.
 */

const PALETTES: readonly (readonly string[])[] = [
  ["#f2ede4", "#b5443a", "#26221c", "#d98e32", "#3a4a6b"],
  ["#e8e4d8", "#3d6b4f", "#57a773", "#e8c84a", "#26221c"],
  ["#f4efe8", "#5a7fd6", "#3a4a6b", "#d96fa8", "#2a251d"],
  ["#efe6d8", "#8a6fc0", "#d96fa8", "#e8c84a", "#3a2f4a"],
  ["#ece8e0", "#26221c", "#b5443a", "#f2ede4", "#8c6a4f"],
];

function soft(ctx: CanvasRenderingContext2D, rng: Rng, colors: readonly string[]) {
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = pick(rng, colors);
    ctx.globalAlpha = randRange(rng, 0.35, 0.8);
    ctx.beginPath();
    ctx.ellipse(
      randRange(rng, 100, 700),
      randRange(rng, 80, 520),
      randRange(rng, 60, 260),
      randRange(rng, 60, 220),
      randRange(rng, 0, Math.PI),
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
}

function bars(ctx: CanvasRenderingContext2D, rng: Rng, colors: readonly string[]) {
  const n = randInt(rng, 4, 7);
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = pick(rng, colors);
    ctx.globalAlpha = randRange(rng, 0.7, 1);
    const w = randRange(rng, 40, 160);
    ctx.save();
    ctx.translate(randRange(rng, 60, 740), 300);
    ctx.rotate(randRange(rng, -0.25, 0.25));
    ctx.fillRect(-w / 2, -280, w, 560);
    ctx.restore();
  }
}

function arcs(ctx: CanvasRenderingContext2D, rng: Rng, colors: readonly string[]) {
  const n = randInt(rng, 3, 6);
  for (let i = 0; i < n; i++) {
    ctx.strokeStyle = pick(rng, colors);
    ctx.globalAlpha = randRange(rng, 0.6, 1);
    ctx.lineWidth = randRange(rng, 10, 42);
    ctx.beginPath();
    ctx.arc(
      randRange(rng, 150, 650),
      randRange(rng, 120, 480),
      randRange(rng, 60, 240),
      randRange(rng, 0, Math.PI * 2),
      randRange(rng, Math.PI * 0.6, Math.PI * 1.8),
    );
    ctx.stroke();
  }
}

const STYLES = [soft, bars, arcs] as const;

export function sampleArt(seed: string): string {
  const rng = createRng(`ourspace:art:v1:${seed}`);
  const colors = pick(rng, PALETTES);
  const canvas = document.createElement("canvas");
  canvas.width = 800;
  canvas.height = 600;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("no 2d context");
  }

  ctx.fillStyle = colors[0] as string;
  ctx.fillRect(0, 0, 800, 600);

  const style = pick(rng, STYLES);
  style(ctx, rng, colors.slice(1));
  // A second pass of a (possibly different) style adds depth.
  pick(rng, STYLES)(ctx, rng, colors.slice(1));

  // Paper grain.
  ctx.globalAlpha = 0.05;
  ctx.fillStyle = "#26221c";
  for (let i = 0; i < 900; i++) {
    ctx.fillRect(randRange(rng, 0, 800), randRange(rng, 0, 600), 2, 2);
  }
  ctx.globalAlpha = 1;

  return canvas.toDataURL("image/jpeg", 0.82);
}
