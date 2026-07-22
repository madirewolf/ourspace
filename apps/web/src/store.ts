import { create } from "zustand";
import { persist, type StateStorage, createJSONStorage } from "zustand/middleware";
import type { AvatarDoc, ModuleDoc, MoodItem, PhotoItem, ProfileDoc } from "@atrium/core";

export type Screen = { name: "profile" } | { name: "gallery"; moduleId: string };

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
  getItem: (name) => window.localStorage.getItem(name),
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
  /** null until onboarding finishes — App shows the quiz while null. */
  profile: ProfileDoc | null;
  screen: Screen;
  setScreen: (screen: Screen) => void;
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
      screen: { name: "profile" },
      setScreen: (screen) => set({ screen }),
      createProfile: (profile) => set({ profile, screen: { name: "profile" } }),
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
      name: "atrium-v1",
      storage: createJSONStorage(() => guardedStorage),
      partialize: (s) => ({ profile: s.profile ? stripSessionUrls(s.profile) : null }),
    },
  ),
);
