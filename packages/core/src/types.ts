/**
 * The document model. Avatars and profiles are parameters, not meshes
 * (CLAUDE.md principle 3): compact JSON rendered deterministically on the
 * client. These shapes are what a backend will eventually store verbatim.
 */

export interface AvatarDoc {
  version: 1;
  /** Hex colors. */
  skin: string;
  hairColor: string;
  eyeColor: string;
  top: string;
  bottom: string;
  shoes: string;
  /** Ids from the avatar catalog (packages/avatar). */
  hairStyle: string;
  accessory: string;
}

export type ModuleKind = "photos" | "music" | "moodboard" | "text";

export interface PhotoItem {
  id: string;
  /** Data URL or (later) storage URL. */
  src: string;
  caption?: string;
}

export interface TrackItem {
  id: string;
  title: string;
  /** Object/data URL when a file is attached this session; may be absent. */
  src?: string;
}

export type MoodItem =
  | { id: string; kind: "color"; value: string }
  | { id: string; kind: "image"; src: string }
  | { id: string; kind: "note"; text: string };

interface ModuleBase {
  id: string;
  kind: ModuleKind;
  title: string;
}

export interface PhotosModule extends ModuleBase {
  kind: "photos";
  items: PhotoItem[];
}

export interface MusicModule extends ModuleBase {
  kind: "music";
  tracks: TrackItem[];
  /** The MySpace move: this track plays on the profile page. */
  favoriteTrackId?: string;
}

export interface MoodboardModule extends ModuleBase {
  kind: "moodboard";
  items: MoodItem[];
}

export interface TextModule extends ModuleBase {
  kind: "text";
  body: string;
}

export type ModuleDoc = PhotosModule | MusicModule | MoodboardModule | TextModule;

export interface ProfileDoc {
  version: 1;
  name: string;
  username: string;
  about: string;
  avatar: AvatarDoc;
  /** Craft ids chosen in onboarding (see archetypes.ts). */
  crafts: string[];
  modules: ModuleDoc[];
}
