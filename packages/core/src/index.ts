// Pure, deterministic core: document types, archetype logic, seeded PRNG,
// color utilities. No three.js, no DOM, no Math.random, no clocks
// (enforced by ESLint).

export { clamp, lerp, smoothstep } from "./math";
export { createRng, randRange, randInt, pick, type Rng } from "./prng";
export {
  hexToRgb,
  rgbToHex,
  rgbToHsl,
  hslToRgb,
  shiftHue,
  shade,
  mixRgb,
  readableAccent,
  neonAccent,
  type Rgb,
} from "./color";
export { CRAFTS, modulesForCrafts, type Craft } from "./archetypes";
export type {
  AvatarDoc,
  ProfileDoc,
  ModuleDoc,
  ModuleKind,
  PhotosModule,
  MusicModule,
  MoodboardModule,
  TextModule,
  PhotoItem,
  TrackItem,
  MoodItem,
} from "./types";
