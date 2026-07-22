import type { ModuleDoc } from "./types";

/**
 * The onboarding quiz: what a person makes. Answers assemble a starting
 * archetype — a first set of modules. Starting points, never cages
 * (CLAUDE.md principle 4): everything built here is fully editable after.
 */

export interface Craft {
  id: string;
  label: string;
  emoji: string;
  blurb: string;
}

export const CRAFTS: readonly Craft[] = [
  {
    id: "visual",
    label: "Visual art",
    emoji: "🎨",
    blurb: "painting, illustration, digital art",
  },
  {
    id: "photography",
    label: "Photography",
    emoji: "📷",
    blurb: "film, digital, phone — it counts",
  },
  {
    id: "music",
    label: "Music",
    emoji: "🎧",
    blurb: "songs, beats, scores, noise",
  },
  {
    id: "writing",
    label: "Writing",
    emoji: "✏️",
    blurb: "poems, zines, essays, fiction",
  },
  {
    id: "film",
    label: "Film & video",
    emoji: "🎬",
    blurb: "shorts, edits, animation",
  },
  {
    id: "maker",
    label: "Making things",
    emoji: "🧵",
    blurb: "ceramics, textiles, 3D, crafts",
  },
] as const;

/**
 * Assemble the starting modules for a set of crafts. `makeId` is injected so
 * this stays pure — the caller decides how ids are minted.
 */
export function modulesForCrafts(crafts: readonly string[], makeId: () => string): ModuleDoc[] {
  const modules: ModuleDoc[] = [];
  const has = (id: string) => crafts.includes(id);

  if (has("visual") || has("maker")) {
    modules.push({ id: makeId(), kind: "photos", title: "Works", items: [] });
  }
  if (has("photography")) {
    modules.push({ id: makeId(), kind: "photos", title: "Photography", items: [] });
  }
  if (has("music")) {
    modules.push({ id: makeId(), kind: "music", title: "Sounds", tracks: [] });
  }
  if (has("film")) {
    modules.push({ id: makeId(), kind: "photos", title: "Stills & frames", items: [] });
  }
  if (has("writing")) {
    modules.push({
      id: makeId(),
      kind: "text",
      title: "Writing",
      body: "",
    });
  }

  // Everyone gets a moodboard — inspiration is universal.
  modules.push({ id: makeId(), kind: "moodboard", title: "Moodboard", items: [] });

  // A completely empty profile still deserves one place to put work.
  if (modules.length === 1) {
    modules.unshift({ id: makeId(), kind: "photos", title: "Works", items: [] });
  }

  return modules;
}
