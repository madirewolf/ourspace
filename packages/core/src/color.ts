import { clamp } from "./math";

/** [r, g, b] in [0, 1]. */
export type Rgb = [number, number, number];

export function hexToRgb(hex: string): Rgb {
  const value = hex.replace("#", "");
  const n = parseInt(value, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

export function rgbToHex([r, g, b]: Rgb): string {
  const to2 = (c: number) =>
    Math.round(clamp(c, 0, 1) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${to2(r)}${to2(g)}${to2(b)}`;
}

/** h in [0, 360), s and l in [0, 1]. Pure arithmetic — deterministic. */
export function rgbToHsl([r, g, b]: Rgb): [number, number, number] {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) {
    return [0, 0, l];
  }
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === r) {
    h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
  } else if (max === g) {
    h = ((b - r) / d + 2) * 60;
  } else {
    h = ((r - g) / d + 4) * 60;
  }
  return [h, s, l];
}

export function hslToRgb([h, s, l]: [number, number, number]): Rgb {
  if (s === 0) {
    return [l, l, l];
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hue = (t: number) => {
    let x = t;
    if (x < 0) x += 1;
    if (x > 1) x -= 1;
    if (x < 1 / 6) return p + (q - p) * 6 * x;
    if (x < 1 / 2) return q;
    if (x < 2 / 3) return p + (q - p) * (2 / 3 - x) * 6;
    return p;
  };
  const hNorm = (((h % 360) + 360) % 360) / 360;
  return [hue(hNorm + 1 / 3), hue(hNorm), hue(hNorm - 1 / 3)];
}

/** Rotate a hex color's hue by `degrees`, preserving saturation and lightness. */
export function shiftHue(hex: string, degrees: number): string {
  const [h, s, l] = rgbToHsl(hexToRgb(hex));
  return rgbToHex(hslToRgb([h + degrees, s, l]));
}

/** Lighten (t > 0) or darken (t < 0) a hex color toward white/black. */
export function shade(hex: string, t: number): string {
  const [r, g, b] = hexToRgb(hex);
  const target = t > 0 ? 1 : 0;
  const amt = Math.abs(clamp(t, -1, 1));
  return rgbToHex([lerpChannel(r), lerpChannel(g), lerpChannel(b)]);

  function lerpChannel(c: number): number {
    return c + (target - c) * amt;
  }
}

export function mixRgb(a: Rgb, b: Rgb, t: number): Rgb {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

/**
 * Derive a UI accent from an arbitrary color (e.g. an avatar's shirt):
 * clamp lightness and floor saturation so light text stays readable on it.
 * A cream shirt must not produce a cream button.
 */
export function readableAccent(hex: string): string {
  const [h, s, l] = rgbToHsl(hexToRgb(hex));
  return rgbToHex(hslToRgb([h, Math.max(s, 0.28), clamp(l, 0.22, 0.44)]));
}

/**
 * The dark-theme counterpart: push a color toward neon so it glows against
 * a near-black panel. A black shirt must not produce a black glow.
 */
export function neonAccent(hex: string): string {
  const [h, s, l] = rgbToHsl(hexToRgb(hex));
  return rgbToHex(hslToRgb([h, Math.max(s, 0.55), clamp(l, 0.55, 0.7)]));
}
