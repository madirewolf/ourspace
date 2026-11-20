import { useEffect, useState } from "react";
import {
  CRAFTS,
  neonAccent,
  type ModuleDoc,
  type MusicModule,
  type TrackItem,
} from "@ourspace/core";
import { AvatarStage } from "../components/AvatarStage";
import { getDiscoveryCreator } from "./catalog";
import { useNavigate } from "../navigation";

function favoriteTrack(modules: ModuleDoc[]): { track: TrackItem; module: MusicModule } | null {
  for (const module of modules) {
    if (module.kind !== "music" || !module.favoriteTrackId) continue;
    const track = module.tracks.find((item) => item.id === module.favoriteTrackId);
    if (track) return { track, module };
  }
  return null;
}

export function VisitorProfilePage({ profileId }: { profileId: string }) {
  const setScreen = useNavigate();
  const creator = getDiscoveryCreator(profileId);
  const [following, setFollowing] = useState(creator?.relation === "friend");

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setScreen({ name: "discovery", resume: true });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setScreen]);

  useEffect(() => {
    if (!creator) setScreen({ name: "discovery", resume: true });
  }, [creator, setScreen]);
  if (!creator) return null;

  const profile = creator.profile;
  const favorite = favoriteTrack(profile.modules);
  const accent = neonAccent(creator.planetAccent);

  return (
    <div className="visitor-shell" style={{ ["--accent" as string]: accent }}>
      <nav className="visitor-nav">
        <button
          type="button"
          className="visitor-back"
          onClick={() => setScreen({ name: "discovery", resume: true })}
        >
          ← Back to orbit
        </button>
        <div className="visitor-location">
          <span /> YOU ARE HERE // @{profile.username}
        </div>
        <button
          type="button"
          className="visitor-home"
          onClick={() => setScreen({ name: "profile" })}
        >
          my space ↗
        </button>
      </nav>

      <main className="visitor-profile">
        <header className="visitor-hero card">
          <div
            className="visitor-planet-mark"
            style={{
              ["--planet" as string]: creator.planetColor,
              ["--planet-accent" as string]: creator.planetAccent,
            }}
          >
            <i />
            <span />
          </div>
          <div className="visitor-avatar">
            <AvatarStage doc={profile.avatar} turntable />
          </div>
          <div className="visitor-identity">
            <div className="profile-kicker">CREATOR WORLD // {creator.vibe.toUpperCase()}</div>
            <h1 className="display">{profile.name}</h1>
            <div className="username">@{profile.username}</div>
            <p>{profile.about}</p>
            <div className="preview-crafts">
              {profile.crafts.map((craft) => (
                <span key={craft}>{CRAFTS.find((item) => item.id === craft)?.label ?? craft}</span>
              ))}
            </div>
            <div className="visitor-signal">◎ {creator.signal}</div>
          </div>
          <div className="visitor-actions">
            <button
              type="button"
              className={`btn ${following ? "ghost" : "primary"}`}
              onClick={() => setFollowing((value) => !value)}
            >
              {following ? "✓ In your orbit" : "+ Add to orbit"}
            </button>
            <small>Read-only visit · their space stays theirs</small>
          </div>
        </header>

        {favorite && (
          <section className="visitor-soundbar card">
            <div className="soundtrack-disc">
              <i />
              <span>♪</span>
            </div>
            <div>
              <small>THIS WORLD IS PLAYING</small>
              <strong>{favorite.track.title}</strong>
            </div>
            <span className="track-missing">signal preview · audio not attached</span>
            <button
              type="button"
              className="btn tiny"
              onClick={() =>
                setScreen({ name: "visitorRave", profileId, moduleId: favorite.module.id })
              }
            >
              Enter sound room ↗
            </button>
          </section>
        )}

        <div className="visitor-module-count">
          <span>INSIDE @{profile.username}</span>
          <b>{String(profile.modules.length).padStart(2, "0")} ROOMS</b>
        </div>
        {profile.modules.map((module, index) => (
          <section key={module.id} className={`card visitor-module module-${module.kind}`}>
            <div className="module-head">
              <div className="module-title-wrap">
                <span className="module-index">{String(index + 1).padStart(2, "0")}</span>
                <h2 className="module-title">{module.title}</h2>
                <span className="module-kind">
                  {module.kind === "music" ? "SOUND ROOM" : module.kind.toUpperCase()}
                </span>
              </div>
            </div>
            {module.kind === "photos" && (
              <>
                <div className="photo-grid">
                  {module.items.map((item) => (
                    <figure key={item.id} className="photo">
                      <img src={item.src} alt={item.caption ?? "artwork"} />
                    </figure>
                  ))}
                </div>
                <div className="module-actions">
                  <button
                    type="button"
                    className="btn primary"
                    onClick={() =>
                      setScreen({ name: "visitorGallery", profileId, moduleId: module.id })
                    }
                  >
                    Walk their gallery ↗
                  </button>
                </div>
              </>
            )}
            {module.kind === "music" && (
              <>
                <ul className="tracks">
                  {module.tracks.map((track, trackIndex) => (
                    <li
                      key={track.id}
                      className={`track${track.id === module.favoriteTrackId ? " favorite" : ""}`}
                    >
                      <span className="track-n">{String(trackIndex + 1).padStart(2, "0")}</span>
                      <span className="track-title">
                        {track.title}
                        {track.id === module.favoriteTrackId && <small>PROFILE SONG</small>}
                      </span>
                      <span className="track-missing">remote signal</span>
                    </li>
                  ))}
                </ul>
                <div className="module-actions">
                  <button
                    type="button"
                    className="btn primary"
                    onClick={() =>
                      setScreen({ name: "visitorRave", profileId, moduleId: module.id })
                    }
                  >
                    Enter their rave ↗
                  </button>
                </div>
              </>
            )}
            {module.kind === "moodboard" && (
              <div className="mood-grid">
                {module.items.map((item) => (
                  <div key={item.id} className={`mood mood-${item.kind}`}>
                    {item.kind === "image" && (
                      <img src={item.src} alt={`${profile.name}'s inspiration`} />
                    )}
                    {item.kind === "note" && <p>{item.text}</p>}
                    {item.kind === "color" && (
                      <div className="mood-color" style={{ background: item.value }}>
                        <code>{item.value}</code>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            {module.kind === "text" && (
              <div className="text-module">
                {module.body.split("\n\n").map((paragraph, paragraphIndex) => (
                  <p key={paragraphIndex}>{paragraph}</p>
                ))}
              </div>
            )}
          </section>
        ))}

        <footer className="visitor-footer">
          <button type="button" onClick={() => setScreen({ name: "discovery", resume: true })}>
            ← keep exploring the constellation
          </button>
          <span>you visited @{profile.username} without changing a thing</span>
        </footer>
      </main>
    </div>
  );
}
