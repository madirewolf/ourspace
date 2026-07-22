import { pick, type AvatarDoc, type Rng } from "@ourspace/core";

/**
 * Everything an avatar can be. Ids are stable forever — an AvatarDoc written
 * today must render the same after any catalog addition (append, never
 * renumber or repurpose).
 */

export interface CatalogEntry {
  id: string;
  label: string;
}

export const SKIN_TONES: readonly string[] = [
  "#f9e0c7",
  "#f6d7b0",
  "#eec1a3",
  "#d9a066",
  "#b07b4f",
  "#8c5a33",
  "#5d3a1f",
  "#b8e0c9", // mint — creators get to be mint
  "#cbb3e6", // lavender
];

export const HAIR_COLORS: readonly string[] = [
  "#241f1c",
  "#4a342a",
  "#8a5a2e",
  "#c98a3d",
  "#e8d8a0",
  "#b8443a",
  "#d96fa8",
  "#5a7fd6",
  "#57a773",
  "#c9c9d4",
];

export const EYE_COLORS: readonly string[] = [
  "#2b2420",
  "#4a342a",
  "#3d6b4f",
  "#3a5f8a",
  "#7a4a8a",
  "#a83a3a",
];

export const OUTFIT_COLORS: readonly string[] = [
  "#f2ede4",
  "#26221c",
  "#b5443a",
  "#d98e32",
  "#e8c84a",
  "#57a773",
  "#3d6b4f",
  "#5a7fd6",
  "#3a4a6b",
  "#8a6fc0",
  "#d96fa8",
  "#8c6a4f",
];

export const HAIR_STYLES: readonly CatalogEntry[] = [
  { id: "none", label: "Bald" },
  { id: "buzz", label: "Buzz" },
  { id: "bowl", label: "Bowl" },
  { id: "spiky", label: "Spiky" },
  { id: "ponytail", label: "Ponytail" },
  { id: "buns", label: "Buns" },
  { id: "afro", label: "Afro" },
  { id: "long", label: "Long" },
];

export const ACCESSORIES: readonly CatalogEntry[] = [
  { id: "none", label: "None" },
  { id: "glasses", label: "Glasses" },
  { id: "shades", label: "Shades" },
  { id: "beret", label: "Beret" },
  { id: "headphones", label: "Headphones" },
];

export const DEFAULT_AVATAR: AvatarDoc = {
  version: 1,
  skin: "#eec1a3",
  hairColor: "#4a342a",
  eyeColor: "#2b2420",
  top: "#57a773",
  bottom: "#3a4a6b",
  shoes: "#26221c",
  hairStyle: "bowl",
  accessory: "none",
};

/** A deterministic avatar from a seeded PRNG (e.g. seeded by username). */
export function randomAvatar(rng: Rng): AvatarDoc {
  return {
    version: 1,
    skin: pick(rng, SKIN_TONES),
    hairColor: pick(rng, HAIR_COLORS),
    eyeColor: pick(rng, EYE_COLORS),
    top: pick(rng, OUTFIT_COLORS),
    bottom: pick(rng, OUTFIT_COLORS),
    shoes: pick(rng, OUTFIT_COLORS),
    hairStyle: pick(rng, HAIR_STYLES).id,
    accessory: pick(rng, ACCESSORIES).id,
  };
}
