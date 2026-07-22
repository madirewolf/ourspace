import type { AvatarDoc, ProfileDoc } from "@ourspace/core";
import { sampleArt } from "../sampleArt";

export type DiscoveryRelation = "friend" | "new" | "stranger";

export interface DiscoveryCreator {
  id: string;
  profile: ProfileDoc;
  relation: DiscoveryRelation;
  vibe: string;
  signal: string;
  planetColor: string;
  planetAccent: string;
}

interface CreatorSeed {
  id: string;
  name: string;
  username: string;
  about: string;
  crafts: string[];
  relation: DiscoveryRelation;
  vibe: string;
  signal: string;
  planetColor: string;
  planetAccent: string;
  avatar: AvatarDoc;
  note: string;
  track: string;
}

const SEEDS: CreatorSeed[] = [
  {
    id: "mara-vale",
    name: "Mara Vale",
    username: "maravale",
    about: "Film photos, hand-painted flyers, and small evidence that a night actually happened.",
    crafts: ["photography", "visual"],
    relation: "friend",
    vibe: "after-hours romantic",
    signal: "Toronto · usually awake",
    planetColor: "#6f35d8",
    planetAccent: "#ff55ca",
    avatar: avatar(
      "#d9a066",
      "#241f1c",
      "#3d6b4f",
      "#8a6fc0",
      "#26221c",
      "#26221c",
      "buns",
      "shades",
    ),
    note: "Flash glare, violet ink, the last train home.",
    track: "Blue Exit — 3:17 AM",
  },
  {
    id: "ari-flux",
    name: "Ari Flux",
    username: "ariflux",
    about:
      "I build loud little worlds out of field recordings, broken synths, and practical effects.",
    crafts: ["music", "film"],
    relation: "friend",
    vibe: "kinetic and electric",
    signal: "Montreal · open to collabs",
    planetColor: "#0c8f88",
    planetAccent: "#54ffdc",
    avatar: avatar(
      "#8c5a33",
      "#57a773",
      "#2b2420",
      "#26221c",
      "#3a4a6b",
      "#f2ede4",
      "spiky",
      "headphones",
    ),
    note: "Distortion is a texture, not a mistake.",
    track: "Soft Crash — Ari Flux",
  },
  {
    id: "kaito-moss",
    name: "Kaito Moss",
    username: "kaitomoss",
    about: "Tiny ceramic creatures and stories about where they go when nobody is looking.",
    crafts: ["maker", "writing"],
    relation: "stranger",
    vibe: "quietly strange",
    signal: "Kyoto · collecting pen pals",
    planetColor: "#688b34",
    planetAccent: "#c8ff32",
    avatar: avatar(
      "#eec1a3",
      "#4a342a",
      "#3a5f8a",
      "#57a773",
      "#8c6a4f",
      "#26221c",
      "bowl",
      "glasses",
    ),
    note: "Soft moss, kiln heat, five-line ghost stories.",
    track: "Garden Receiver — Field Note 08",
  },
  {
    id: "june-hex",
    name: "June Hex",
    username: "junehex",
    about: "Poetry, screenshots, browser ghosts. I keep archives of things the web forgot.",
    crafts: ["writing", "photography"],
    relation: "new",
    vibe: "tender internet archaeology",
    signal: "Online 12m ago · new arrival",
    planetColor: "#324a91",
    planetAccent: "#6da7ff",
    avatar: avatar(
      "#f6d7b0",
      "#5a7fd6",
      "#7a4a8a",
      "#3a4a6b",
      "#26221c",
      "#d96fa8",
      "long",
      "none",
    ),
    note: "Cached pages, blue hour, unfinished sentences.",
    track: "404 Lullaby — Soft Static",
  },
  {
    id: "odo-bloom",
    name: "Odo Bloom",
    username: "odobloom",
    about: "Maximalist paintings and gentle dance music for rooms with too many lamps.",
    crafts: ["visual", "music"],
    relation: "stranger",
    vibe: "bright beautiful overload",
    signal: "Lagos · sends voice notes",
    planetColor: "#ca4d18",
    planetAccent: "#ffbd39",
    avatar: avatar(
      "#5d3a1f",
      "#d96fa8",
      "#2b2420",
      "#d98e32",
      "#8a6fc0",
      "#26221c",
      "afro",
      "headphones",
    ),
    note: "More color. Then one more color after that.",
    track: "Lamp Party — Odo Bloom",
  },
  {
    id: "soft-static",
    name: "Soleil Static",
    username: "softstatic",
    about: "Costumes, miniature sets, and slow films about people becoming something else.",
    crafts: ["maker", "film"],
    relation: "new",
    vibe: "dreamlike transformation",
    signal: "Marseille · looking for composers",
    planetColor: "#9c3a74",
    planetAccent: "#ff7fc4",
    avatar: avatar(
      "#b07b4f",
      "#e8d8a0",
      "#3d6b4f",
      "#b5443a",
      "#26221c",
      "#8c6a4f",
      "ponytail",
      "beret",
    ),
    note: "Velvet, painted moons, a door that is slightly too small.",
    track: "Papier Moon — Soleil Static",
  },
];

function avatar(
  skin: string,
  hairColor: string,
  eyeColor: string,
  top: string,
  bottom: string,
  shoes: string,
  hairStyle: string,
  accessory: string,
): AvatarDoc {
  return { version: 1, skin, hairColor, eyeColor, top, bottom, shoes, hairStyle, accessory };
}

function makeProfile(seed: CreatorSeed): ProfileDoc {
  const trackId = `${seed.id}-track`;
  return {
    version: 1,
    name: seed.name,
    username: seed.username,
    about: seed.about,
    crafts: seed.crafts,
    avatar: seed.avatar,
    modules: [
      {
        id: `${seed.id}-works`,
        kind: "photos",
        title: "Selected works",
        items: [1, 2, 3, 4].map((index) => ({
          id: `${seed.id}-work-${index}`,
          src: sampleArt(`discovery:${seed.id}:${index}`),
          caption: `${seed.name} — piece ${String(index).padStart(2, "0")}`,
        })),
      },
      {
        id: `${seed.id}-mood`,
        kind: "moodboard",
        title: "Current atmosphere",
        items: [
          { id: `${seed.id}-note`, kind: "note", text: seed.note },
          { id: `${seed.id}-color-a`, kind: "color", value: seed.planetColor },
          { id: `${seed.id}-color-b`, kind: "color", value: seed.planetAccent },
          {
            id: `${seed.id}-mood-image`,
            kind: "image",
            src: sampleArt(`discovery:${seed.id}:mood`),
          },
        ],
      },
      {
        id: `${seed.id}-sounds`,
        kind: "music",
        title: "Sound moodboard",
        tracks: [
          { id: trackId, title: seed.track },
          { id: `${seed.id}-track-b`, title: "Voice memo from another room" },
        ],
        favoriteTrackId: trackId,
      },
      {
        id: `${seed.id}-note-module`,
        kind: "text",
        title: "Pinned note",
        body: `${seed.note}\n\nIf you found this place by accident, leave with one idea you did not arrive with.`,
      },
    ],
  };
}

export const DISCOVERY_CREATORS: DiscoveryCreator[] = SEEDS.map((seed) => ({
  id: seed.id,
  relation: seed.relation,
  vibe: seed.vibe,
  signal: seed.signal,
  planetColor: seed.planetColor,
  planetAccent: seed.planetAccent,
  profile: makeProfile(seed),
}));

export function getDiscoveryCreator(id: string): DiscoveryCreator | undefined {
  return DISCOVERY_CREATORS.find((creator) => creator.id === id);
}

export function sharedCraftCount(a: readonly string[], b: readonly string[]): number {
  return a.filter((craft) => b.includes(craft)).length;
}
