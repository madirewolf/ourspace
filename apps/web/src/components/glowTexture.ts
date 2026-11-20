import * as THREE from "three";

let glow: THREE.CanvasTexture | null = null;

/**
 * One shared soft radial falloff (white centre, transparent edge). Tinted by
 * material colour and drawn additively it becomes engine glow, light pools,
 * lamp halos and wall washes without adding a single real light.
 */
export function glowTexture(): THREE.CanvasTexture {
  if (glow) return glow;
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (context) {
    const gradient = context.createRadialGradient(
      size / 2,
      size / 2,
      0,
      size / 2,
      size / 2,
      size / 2,
    );
    gradient.addColorStop(0, "rgba(255,255,255,1)");
    gradient.addColorStop(0.22, "rgba(255,255,255,0.62)");
    gradient.addColorStop(0.55, "rgba(255,255,255,0.16)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);
  }
  glow = new THREE.CanvasTexture(canvas);
  glow.colorSpace = THREE.SRGBColorSpace;
  return glow;
}
