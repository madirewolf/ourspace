import { useState, useSyncExternalStore } from "react";
import {
  CRAFTS,
  neonAccent,
  type ModuleDoc,
  type ModuleKind,
  type MusicModule,
  type TrackItem,
} from "@ourspace/core";
import { makeId } from "../ids";
import { getStorageFailed, subscribeStorageHealth, useApp } from "../store";
import { AvatarStage } from "../components/AvatarStage";
import { AvatarBuilder } from "../onboarding/AvatarBuilder";
import { MoodboardView, MusicView, PhotosView, TextView } from "./moduleViews";
import { goTo, useNavigate, withTransition } from "../navigation";

interface AddableModule {
  kind: ModuleKind;
  title: string;
  label: string;
  mark: string;
}

const ADDABLE: AddableModule[] = [
  { kind: "photos", title: "Images", label: "Image room", mark: "IMG" },
  { kind: "music", title: "Sounds", label: "Sounds", mark: "SND" },
  { kind: "music", title: "Sound moodboard", label: "Sound moodboard", mark: "MIX" },
  { kind: "moodboard", title: "Moodboard", label: "Moodboard", mark: "PIN" },
  { kind: "text", title: "Writing", label: "Writing", mark: "TXT" },
];

function blankModule(spec: AddableModule): ModuleDoc {
  const id = makeId();
  switch (spec.kind) {
    case "photos":
      return { id, kind: spec.kind, title: spec.title, items: [] };
    case "music":
      return { id, kind: spec.kind, title: spec.title, tracks: [] };
    case "moodboard":
      return { id, kind: spec.kind, title: spec.title, items: [] };
    case "text":
      return { id, kind: spec.kind, title: spec.title, body: "" };
  }
}

function ModuleBody({ module, editing }: { module: ModuleDoc; editing: boolean }) {
  switch (module.kind) {
    case "photos":
      return <PhotosView module={module} editing={editing} />;
    case "music":
      return <MusicView module={module} editing={editing} />;
    case "moodboard":
      return <MoodboardView module={module} editing={editing} />;
    case "text":
      return <TextView module={module} editing={editing} />;
  }
}

function findFavorite(modules: ModuleDoc[]): { track: TrackItem; module: MusicModule } | null {
  for (const module of modules) {
    if (module.kind !== "music" || !module.favoriteTrackId) continue;
    const track = module.tracks.find((candidate) => candidate.id === module.favoriteTrackId);
    if (track) return { track, module };
  }
  return null;
}

export function ProfilePage() {
  const profile = useApp((s) => s.profile);
  const updateProfile = useApp((s) => s.updateProfile);
  const updateAvatar = useApp((s) => s.updateAvatar);
  const updateModule = useApp((s) => s.updateModule);
  const addModule = useApp((s) => s.addModule);
  const removeModule = useApp((s) => s.removeModule);
  const moveModule = useApp((s) => s.moveModule);
  const signOut = useApp((s) => s.signOut);
  const setScreen = useNavigate();

  const [editing, setEditing] = useState(false);
  const [editingAvatar, setEditingAvatar] = useState(false);
  const [confirmingRemove, setConfirmingRemove] = useState<string | null>(null);
  const storageFull = useSyncExternalStore(subscribeStorageHealth, getStorageFailed);

  if (!profile) return null;
  const accent = neonAccent(profile.avatar.top);
  const favorite = findFavorite(profile.modules);
  const craftLabels = profile.crafts
    .map((id) => CRAFTS.find((craft) => craft.id === id)?.label)
    .filter((label): label is string => Boolean(label));

  const removeWithConfirm = (module: ModuleDoc) => {
    const hasContent =
      (module.kind === "photos" && module.items.length > 0) ||
      (module.kind === "music" && module.tracks.length > 0) ||
      (module.kind === "moodboard" && module.items.length > 0) ||
      (module.kind === "text" && module.body.trim() !== "");
    if (hasContent && confirmingRemove !== module.id) {
      setConfirmingRemove(module.id);
      return;
    }
    if (module.kind === "music") {
      for (const track of module.tracks) {
        if (track.src?.startsWith("blob:")) URL.revokeObjectURL(track.src);
      }
    }
    setConfirmingRemove(null);
    removeModule(module.id);
  };

  const launchIntoOrbit = () => goTo({ name: "discovery" }, "orbit");

  return (
    <div className="profile-shell" style={{ ["--accent" as string]: accent }}>
      <nav className="site-nav profile-nav">
        <button
          className="wordmark wordmark-button"
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        >
          our<span>space</span>
          <i>★</i>
        </button>
        <div className="profile-nav-actions">
          <span className="nav-status">
            <span /> @{profile.username} online
          </span>
          <button type="button" className="nav-link" onClick={() => withTransition(signOut)}>
            log out ↗
          </button>
        </div>
      </nav>

      <main className="profile">
        {storageFull && (
          <div className="storage-banner" role="alert">
            ⚠ Browser storage is full—new changes are not being saved. Remove some images to keep
            your page safe.
          </div>
        )}

        <header className="profile-header card">
          <div className="profile-avatar">
            <AvatarStage doc={profile.avatar} turntable={!editingAvatar} />
          </div>
          <div className="profile-id">
            <div className="profile-kicker">VISITING // @{profile.username}</div>
            <h1 className="display">{profile.name}</h1>
            <div className="username">ourspace.com/@{profile.username}</div>
            {craftLabels.length > 0 && (
              <div className="craft-tags">
                {craftLabels.map((label) => (
                  <span key={label}>{label}</span>
                ))}
              </div>
            )}
            {editing ? (
              <textarea
                className="about-input"
                value={profile.about}
                rows={4}
                onChange={(e) => updateProfile({ about: e.target.value })}
                placeholder="About you…"
              />
            ) : profile.about ? (
              <p className="about">{profile.about}</p>
            ) : (
              <p className="empty-hint">This space is still introducing itself.</p>
            )}
          </div>
          <div className="profile-tools">
            <button
              type="button"
              className="btn small primary"
              onClick={() => setEditing(!editing)}
            >
              {editing ? "✓ Publish changes" : "✎ Edit space"}
            </button>
            {editing && (
              <button
                type="button"
                className="btn small ghost"
                onClick={() => setEditingAvatar(!editingAvatar)}
              >
                {editingAvatar ? "Close avatar lab" : "Edit avatar"}
              </button>
            )}
          </div>
          <span className="profile-sticker">
            WELCOME
            <br />2 MY
            <br />
            WORLD
          </span>
        </header>

        <section className="orbit-launch-card card">
          <div className="launch-orbit-visual" aria-hidden="true">
            <i />
            <span>★</span>
            <b>⌁</b>
          </div>
          <div className="launch-orbit-copy">
            <span className="module-code">DISCOVERY SHIP // READY</span>
            <h2>Leave your page. Find a person.</h2>
            <p>
              Jump off your moodboard and pilot through creator worlds—friends, kindred signals,
              complete opposites, or whoever the universe sends.
            </p>
          </div>
          <button
            type="button"
            className="btn primary launch-orbit-button"
            onClick={launchIntoOrbit}
          >
            Launch into orbit ↗
          </button>
          <small className="launch-orbit-hint">continuous flight · no loading tunnel</small>
        </section>

        {favorite && (
          <section className="profile-soundtrack card">
            <div className="soundtrack-disc">
              <i />
              <span>♪</span>
            </div>
            <div className="soundtrack-copy">
              <span>PROFILE_SONG.MP3</span>
              <strong>{favorite.track.title}</strong>
              <small>selected by @{profile.username}</small>
            </div>
            {favorite.track.src ? (
              <audio
                key={favorite.track.id}
                src={favorite.track.src}
                controls
                autoPlay
                loop
                preload="metadata"
              />
            ) : (
              <div className="signal-missing">
                SIGNAL OFFLINE
                <br />
                <small>re-add the audio file to play</small>
              </div>
            )}
            <button
              type="button"
              className="btn tiny"
              onClick={() => setScreen({ name: "rave", moduleId: favorite.module.id })}
            >
              Enter rave ↗
            </button>
          </section>
        )}

        {editing && editingAvatar && (
          <section className="card builder-card">
            <div className="module-code">AVATAR_LAB.EXE</div>
            <AvatarBuilder value={profile.avatar} onChange={updateAvatar} />
          </section>
        )}

        <div className="module-stack-label">
          <span>PROFILE MODULES</span>
          <b>{String(profile.modules.length).padStart(2, "0")} INSTALLED</b>
        </div>
        {profile.modules.map((module, index) => (
          <section key={module.id} className={`card module module-${module.kind}`}>
            <div className="module-head">
              <div className="module-title-wrap">
                <span className="module-index">{String(index + 1).padStart(2, "0")}</span>
                {editing ? (
                  <input
                    className="module-title-input"
                    value={module.title}
                    onChange={(e) => updateModule({ ...module, title: e.target.value })}
                  />
                ) : (
                  <h2 className="module-title">{module.title}</h2>
                )}
                <span className="module-kind">
                  {module.kind === "music" ? "SOUND ROOM" : module.kind.toUpperCase()}
                </span>
              </div>
              {editing && (
                <div className="module-tools">
                  <button
                    type="button"
                    className="btn tiny"
                    disabled={index === 0}
                    onClick={() => moveModule(module.id, -1)}
                    aria-label="Move up"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="btn tiny"
                    disabled={index === profile.modules.length - 1}
                    onClick={() => moveModule(module.id, 1)}
                    aria-label="Move down"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className={`btn tiny danger${confirmingRemove === module.id ? " confirming" : ""}`}
                    onClick={() => removeWithConfirm(module)}
                    aria-label="Remove module"
                  >
                    {confirmingRemove === module.id ? "remove?" : "×"}
                  </button>
                </div>
              )}
            </div>
            <ModuleBody module={module} editing={editing} />
          </section>
        ))}

        {editing && (
          <section className="card add-module">
            <div>
              <span className="builder-label">Install a new module</span>
              <p>Add another room without changing who you are.</p>
            </div>
            <div className="module-actions">
              {ADDABLE.map((item) => (
                <button
                  key={`${item.kind}-${item.title}`}
                  type="button"
                  className="add-module-button"
                  onClick={() => addModule(blankModule(item))}
                >
                  <b>{item.mark}</b>
                  <span>+ {item.label}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        <footer className="profile-footer">
          <span>ourspace © 2000—FOREVER</span>
          <span>local-first preview // made for people who make things</span>
        </footer>
      </main>
    </div>
  );
}
