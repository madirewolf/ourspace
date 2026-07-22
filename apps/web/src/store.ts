import { create } from "zustand";
import { persist, type StateStorage, createJSONStorage } from "zustand/middleware";
import type { AvatarDoc, ModuleDoc, MoodItem, PhotoItem, ProfileDoc } from "@ourspace/core";

export type Screen =
  | { name: "profile" }
  | { name: "gallery"; moduleId: string }
  | { name: "rave"; moduleId: string }
  | { name: "discovery"; resume?: boolean }
  | { name: "visitor"; profileId: string }
  | { name: "visitorGallery"; profileId: string; moduleId: string }
  | { name: "visitorRave"; profileId: string; moduleId: string };

export type DiscoveryMode = "all" | "friends" | "similar" | "opposite" | "random" | "new";

interface DiscoveryNavState {
  mode: DiscoveryMode;
  query: string;
  selectedId: string;
  randomSeed: number;
}

/* ------------------------------------------------------------------ */
/* Persistence plumbing.                                               */
/*                                                                     */
/* localStorage writes are debounced (typing must not re-serialize a   */
/* multi-megabyte profile per keystroke), guarded against quota        */
/* overflow (the UI shows a banner instead of silently losing data),   */
/* and disabled entirely in demo mode so ?demo=1 can never become the  */
/* browser's permanent profile.                                        */
/* ------------------------------------------------------------------ */

let writesEnabled = true;

/** Demo mode calls this before seeding — demo data must never persist. */
export function disableStorageWrites(): void {
  writesEnabled = false;
}

let storageFailed = false;
const storageSubscribers = new Set<() => void>();

function setStorageFailed(failed: boolean): void {
  if (failed !== storageFailed) {
    storageFailed = failed;
    for (const cb of storageSubscribers) cb();
  }
}

/** For useSyncExternalStore: has the last save failed (storage full)? */
export function subscribeStorageHealth(cb: () => void): () => void {
  storageSubscribers.add(cb);
  return () => storageSubscribers.delete(cb);
}
export function getStorageFailed(): boolean {
  return storageFailed;
}

const WRITE_DEBOUNCE_MS = 400;
let pendingWrite: { name: string; value: string } | null = null;
let writeTimer: number | undefined;

function flushWrite(): void {
  if (!pendingWrite) return;
  const { name, value } = pendingWrite;
  pendingWrite = null;
  try {
    window.localStorage.setItem(name, value);
    setStorageFailed(false);
  } catch {
    // QuotaExceededError (or private-mode weirdness): keep the app running
    // from memory and tell the user their page is no longer being saved.
    setStorageFailed(true);
  }
}

window.addEventListener("beforeunload", flushWrite);

const guardedStorage: StateStorage = {
  getItem: (name) =>
    window.localStorage.getItem(name) ??
    (name === "ourspace-v1" ? window.localStorage.getItem("atrium-v1") : null),
  setItem: (name, value) => {
    if (!writesEnabled) return;
    pendingWrite = { name, value };
    window.clearTimeout(writeTimer);
    writeTimer = window.setTimeout(flushWrite, WRITE_DEBOUNCE_MS);
  },
  removeItem: (name) => window.localStorage.removeItem(name),
};

/** Session-only blob: URLs (audio uploads) must not be persisted — a dead
 * blob string would defeat the "re-add it" fallback after reload. */
function stripSessionUrls(profile: ProfileDoc): ProfileDoc {
  return {
    ...profile,
    modules: profile.modules.map((m) =>
      m.kind === "music"
        ? {
            ...m,
            tracks: m.tracks.map(({ src, ...track }) =>
              src !== undefined && !src.startsWith("blob:") ? { ...track, src } : track,
            ),
          }
        : m,
    ),
  };
}

/* ------------------------------------------------------------------ */

interface AppState {
  /** null until onboarding finishes — App shows the account gateway while null. */
  profile: ProfileDoc | null;
  /** Local-session affordance until real account auth arrives. */
  signedOut: boolean;
  screen: Screen;
  /** Session-only browsing context, preserved while moving through other people's spaces. */
  discovery: DiscoveryNavState;
  setScreen: (screen: Screen) => void;
  updateDiscovery: (patch: Partial<DiscoveryNavState>) => void;
  signIn: () => void;
  signOut: () => void;
  createProfile: (profile: ProfileDoc) => void;
  updateProfile: (patch: Partial<Omit<ProfileDoc, "modules" | "avatar">>) => void;
  updateAvatar: (avatar: AvatarDoc) => void;
  addModule: (module: ModuleDoc) => void;
  updateModule: (module: ModuleDoc) => void;
  removeModule: (id: string) => void;
  moveModule: (id: string, direction: -1 | 1) => void;
  /** Append against *current* state — async file ingestion must not write
   * back a stale render-time snapshot of the module. */
  appendPhotos: (moduleId: string, items: PhotoItem[]) => void;
  appendMoodItems: (moduleId: string, items: MoodItem[]) => void;
}

export const useApp = create<AppState>()(
  persist(
    (set) => ({
      profile: null,
      signedOut: false,
      screen: { name: "profile" },
      discovery: {
        mode: "all",
        query: "",
        selectedId: "mara-vale",
        randomSeed: 0,
      },
      setScreen: (screen) => set({ screen }),
      updateDiscovery: (patch) => set((state) => ({ discovery: { ...state.discovery, ...patch } })),
      signIn: () => set({ signedOut: false, screen: { name: "profile" } }),
      signOut: () => set({ signedOut: true, screen: { name: "profile" } }),
      createProfile: (profile) => set({ profile, signedOut: false, screen: { name: "profile" } }),
      updateProfile: (patch) =>
        set((s) => (s.profile ? { profile: { ...s.profile, ...patch } } : s)),
      updateAvatar: (avatar) => set((s) => (s.profile ? { profile: { ...s.profile, avatar } } : s)),
      addModule: (module) =>
        set((s) =>
          s.profile ? { profile: { ...s.profile, modules: [...s.profile.modules, module] } } : s,
        ),
      updateModule: (module) =>
        set((s) =>
          s.profile
            ? {
                profile: {
                  ...s.profile,
                  modules: s.profile.modules.map((m) => (m.id === module.id ? module : m)),
                },
              }
            : s,
        ),
      removeModule: (id) =>
        set((s) =>
          s.profile
            ? { profile: { ...s.profile, modules: s.profile.modules.filter((m) => m.id !== id) } }
            : s,
        ),
      moveModule: (id, direction) =>
        set((s) => {
          if (!s.profile) return s;
          const modules = [...s.profile.modules];
          const from = modules.findIndex((m) => m.id === id);
          const to = from + direction;
          if (from < 0 || to < 0 || to >= modules.length) return s;
          const [moved] = modules.splice(from, 1);
          modules.splice(to, 0, moved as ModuleDoc);
          return { profile: { ...s.profile, modules } };
        }),
      appendPhotos: (moduleId, items) =>
        set((s) =>
          s.profile
            ? {
                profile: {
                  ...s.profile,
                  modules: s.profile.modules.map((m) =>
                    m.id === moduleId && m.kind === "photos"
                      ? { ...m, items: [...m.items, ...items] }
                      : m,
                  ),
                },
              }
            : s,
        ),
      appendMoodItems: (moduleId, items) =>
        set((s) =>
          s.profile
            ? {
                profile: {
                  ...s.profile,
                  modules: s.profile.modules.map((m) =>
                    m.id === moduleId && m.kind === "moodboard"
                      ? { ...m, items: [...m.items, ...items] }
                      : m,
                  ),
                },
              }
            : s,
        ),
    }),
    {
      // getItem reads the legacy key once so existing local profiles survive the rename.
      name: "ourspace-v1",
      storage: createJSONStorage(() => guardedStorage),
      partialize: (s) => ({
        profile: s.profile ? stripSessionUrls(s.profile) : null,
        signedOut: s.signedOut,
      }),
    },
  ),
);
