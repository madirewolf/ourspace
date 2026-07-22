import { useState, useSyncExternalStore } from "react";
import { readableAccent, type ModuleDoc, type ModuleKind } from "@atrium/core";
import { makeId } from "../ids";
import { getStorageFailed, subscribeStorageHealth, useApp } from "../store";
import { AvatarStage } from "../components/AvatarStage";
import { AvatarBuilder } from "../onboarding/AvatarBuilder";
import { MoodboardView, MusicView, PhotosView, TextView } from "./moduleViews";

const ADDABLE: { kind: ModuleKind; label: string; emoji: string }[] = [
  { kind: "photos", label: "Images", emoji: "🖼️" },
  { kind: "music", label: "Music", emoji: "🎧" },
  { kind: "moodboard", label: "Moodboard", emoji: "📌" },
  { kind: "text", label: "Writing", emoji: "✏️" },
];

function blankModule(kind: ModuleKind): ModuleDoc {
  const id = makeId();
  switch (kind) {
    case "photos":
      return { id, kind, title: "Images", items: [] };
    case "music":
      return { id, kind, title: "Music", tracks: [] };
    case "moodboard":
      return { id, kind, title: "Moodboard", items: [] };
    case "text":
      return { id, kind, title: "Writing", body: "" };
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

export function ProfilePage() {
  const profile = useApp((s) => s.profile);
  const updateProfile = useApp((s) => s.updateProfile);
  const updateAvatar = useApp((s) => s.updateAvatar);
  const updateModule = useApp((s) => s.updateModule);
  const addModule = useApp((s) => s.addModule);
  const removeModule = useApp((s) => s.removeModule);
  const moveModule = useApp((s) => s.moveModule);

  const [editing, setEditing] = useState(false);
  const [editingAvatar, setEditingAvatar] = useState(false);
  const [confirmingRemove, setConfirmingRemove] = useState<string | null>(null);
  const storageFull = useSyncExternalStore(subscribeStorageHealth, getStorageFailed);

  if (!profile) return null;
  const accent = readableAccent(profile.avatar.top);

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

  return (
    <div className="profile" style={{ ["--accent" as string]: accent }}>
      {storageFull && (
        <div className="storage-banner" role="alert">
          ⚠ Your browser's storage is full — changes are no longer being saved. Remove some images
          to keep your page safe.
        </div>
      )}
      <header className="profile-header card">
        <div className="profile-avatar">
          <AvatarStage doc={profile.avatar} turntable={!editingAvatar} />
        </div>
        <div className="profile-id">
          <h1 className="display">{profile.name}</h1>
          <div className="username">@{profile.username}</div>
          {editing ? (
            <textarea
              className="about-input"
              value={profile.about}
              rows={3}
              onChange={(e) => updateProfile({ about: e.target.value })}
              placeholder="About you…"
            />
          ) : (
            profile.about !== "" && <p className="about">{profile.about}</p>
          )}
        </div>
        <div className="profile-tools">
          <button type="button" className="btn small" onClick={() => setEditing(!editing)}>
            {editing ? "✓ Done" : "✎ Edit page"}
          </button>
          {editing && (
            <button
              type="button"
              className="btn small"
              onClick={() => setEditingAvatar(!editingAvatar)}
            >
              {editingAvatar ? "Close builder" : "Edit avatar"}
            </button>
          )}
        </div>
      </header>

      {editing && editingAvatar && (
        <section className="card builder-card">
          <AvatarBuilder value={profile.avatar} onChange={updateAvatar} />
        </section>
      )}

      {profile.modules.map((module, index) => (
        <section key={module.id} className="card module">
          <div className="module-head">
            {editing ? (
              <input
                className="module-title-input"
                value={module.title}
                onChange={(e) => updateModule({ ...module, title: e.target.value })}
              />
            ) : (
              <h2 className="module-title">{module.title}</h2>
            )}
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
                  {confirmingRemove === module.id ? "remove?" : "✕"}
                </button>
              </div>
            )}
          </div>
          <ModuleBody module={module} editing={editing} />
        </section>
      ))}

      {editing && (
        <section className="card add-module">
          <span className="builder-label">Add a room</span>
          <div className="module-actions">
            {ADDABLE.map((a) => (
              <button
                key={a.kind}
                type="button"
                className="btn small"
                onClick={() => addModule(blankModule(a.kind))}
              >
                {a.emoji} {a.label}
              </button>
            ))}
          </div>
        </section>
      )}

      <footer className="profile-footer">
        <span>atrium · local-first preview · everything stays in your browser</span>
      </footer>
    </div>
  );
}
