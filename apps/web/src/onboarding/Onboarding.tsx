import { useState } from "react";
import {
  CRAFTS,
  createRng,
  modulesForCrafts,
  type AvatarDoc,
  type MusicModule,
  type ProfileDoc,
} from "@ourspace/core";
import { randomAvatar } from "@ourspace/avatar";
import { makeId } from "../ids";
import { sampleArt } from "../sampleArt";
import { useApp } from "../store";
import { AvatarBuilder } from "./AvatarBuilder";
import { withTransition } from "../navigation";

type Step = "welcome" | "identity" | "avatar" | "crafts" | "sound" | "about";
const STEPS: Step[] = ["welcome", "identity", "avatar", "crafts", "sound", "about"];

interface FavoriteSongDraft {
  title: string;
  src?: string;
}

/** Seed starter content so a fresh profile (and its gallery) is never empty. */
export function assembleProfile(
  name: string,
  username: string,
  about: string,
  avatar: AvatarDoc,
  crafts: string[],
  favoriteSong?: FavoriteSongDraft,
): ProfileDoc {
  const modules = modulesForCrafts(crafts, makeId);
  for (const module of modules) {
    if (module.kind === "photos" && module.items.length === 0) {
      module.items = [1, 2, 3].map((n) => ({
        id: makeId(),
        src: sampleArt(`${username}:${module.title}:${n}`),
        caption: `Sample piece ${n} — replace me`,
      }));
    }
    if (module.kind === "moodboard") {
      module.items = [
        { id: makeId(), kind: "note", text: "Collect things that feel like you." },
        { id: makeId(), kind: "color", value: avatar.top },
        { id: makeId(), kind: "color", value: avatar.hairColor },
        { id: makeId(), kind: "image", src: sampleArt(`${username}:mood`) },
      ];
    }
    if (module.kind === "text" && module.body === "") {
      module.body = "The first line of something new.";
    }
  }

  if (favoriteSong?.title.trim()) {
    const playlist =
      modules.find(
        (module): module is MusicModule => module.kind === "music" && module.title === "Playlist",
      ) ?? modules.find((module): module is MusicModule => module.kind === "music");
    if (playlist) {
      const id = makeId();
      playlist.tracks.push({
        id,
        title: favoriteSong.title.trim(),
        ...(favoriteSong.src?.trim() ? { src: favoriteSong.src.trim() } : {}),
      });
      playlist.favoriteTrackId = id;
    }
  }

  return { version: 1, name, username, about, avatar, crafts, modules };
}

export function Onboarding({
  onCancel,
  onComplete,
}: {
  onCancel?: () => void;
  onComplete?: () => void;
}) {
  const createProfile = useApp((s) => s.createProfile);
  const [step, setStep] = useState<Step>("welcome");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [avatar, setAvatar] = useState<AvatarDoc | null>(null);
  const [crafts, setCrafts] = useState<string[]>([]);
  const [favoriteSongTitle, setFavoriteSongTitle] = useState("");
  const [favoriteSongUrl, setFavoriteSongUrl] = useState("");
  const [about, setAbout] = useState("");

  const stepIndex = STEPS.indexOf(step);

  const next = () => {
    if (step === "identity" && avatar === null) {
      // Same name, same starting person: the seed stays deterministic.
      setAvatar(randomAvatar(createRng(`ourspace:avatar:v1:${username || name}`)));
    }
    const upcoming = STEPS[stepIndex + 1];
    if (upcoming) withTransition(() => setStep(upcoming));
  };
  const back = () => {
    const previous = STEPS[stepIndex - 1];
    if (previous) withTransition(() => setStep(previous));
  };

  const finish = () => {
    if (!avatar) return;
    withTransition(() => {
      createProfile(
        assembleProfile(name.trim(), username.trim(), about.trim(), avatar, crafts, {
          title: favoriteSongTitle,
          src: favoriteSongUrl,
        }),
      );
      onComplete?.();
    });
  };

  const toggleCraft = (id: string) =>
    setCrafts((current) =>
      current.includes(id) ? current.filter((craft) => craft !== id) : [...current, id],
    );

  return (
    <main className="onboarding">
      <nav className="setup-nav">
        <button className="wordmark wordmark-button" type="button" onClick={onCancel}>
          our<span>space</span>
          <i>★</i>
        </button>
        <span>ACCOUNT SETUP // {String(stepIndex + 1).padStart(2, "0")}</span>
      </nav>
      <div className="onboarding-card">
        <div className="progress" aria-label={`Step ${stepIndex + 1} of ${STEPS.length}`}>
          {STEPS.map((item, index) => (
            <span key={item} className={`dot${index <= stepIndex ? " filled" : ""}`} />
          ))}
          <b>{Math.round(((stepIndex + 1) / STEPS.length) * 100)}%</b>
        </div>

        {step === "welcome" && (
          <div className="step intro-step">
            <div className="eyebrow">NEW_USER_PROTOCOL</div>
            <h1 className="display">
              Build your corner
              <br />
              of the internet.
            </h1>
            <p className="lede">
              Make a low-poly version of yourself, tell us what you create, and we’ll assemble your
              first profile. Every part can be remixed later.
            </p>
            <div className="setup-preview-row">
              <span>
                <b>01</b> identity
              </span>
              <span>
                <b>02</b> avatar
              </span>
              <span>
                <b>03</b> your work
              </span>
              <span>
                <b>04</b> soundtrack
              </span>
            </div>
            <div className="step-actions">
              {onCancel && (
                <button type="button" className="btn ghost" onClick={onCancel}>
                  Exit setup
                </button>
              )}
              <button type="button" className="btn primary" onClick={next}>
                Initialize profile ↗
              </button>
            </div>
          </div>
        )}

        {step === "identity" && (
          <div className="step">
            <div className="eyebrow">01 // NAME YOUR SPACE</div>
            <h2 className="display">Who’s moving in?</h2>
            <p className="lede">This is how visitors will find and remember you.</p>
            <div className="form-grid">
              <label className="field">
                <span>Display name</span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Sam Ellery"
                  autoFocus
                />
              </label>
              <label className="field">
                <span>Username</span>
                <div className="prefixed-input">
                  <b>@</b>
                  <input
                    value={username}
                    onChange={(e) =>
                      setUsername(e.target.value.toLowerCase().replace(/[^\p{L}\p{N}\-_.]/gu, ""))
                    }
                    placeholder="samellery"
                  />
                </div>
                <small>Letters, numbers, dots, dashes—any language.</small>
              </label>
            </div>
            <StepActions back={back} next={next} disabled={!name.trim() || !username.trim()} />
          </div>
        )}

        {step === "avatar" && avatar && (
          <div className="step wide">
            <div className="eyebrow">02 // CHOOSE YOUR FORM</div>
            <h2 className="display">Build your low-poly you.</h2>
            <p className="lede">Sharper silhouettes, visible polygons, main-character energy.</p>
            <AvatarBuilder value={avatar} onChange={setAvatar} />
            <StepActions back={back} next={next} />
          </div>
        )}

        {step === "crafts" && (
          <div className="step">
            <div className="eyebrow">03 // SELECT YOUR PRACTICE</div>
            <h2 className="display">What do you make?</h2>
            <p className="lede">
              Pick everything that applies. Archetypes are starting points, never cages.
            </p>
            <div className="crafts">
              {CRAFTS.map((craft, index) => (
                <button
                  key={craft.id}
                  type="button"
                  className={`craft${crafts.includes(craft.id) ? " selected" : ""}`}
                  onClick={() => toggleCraft(craft.id)}
                >
                  <span className="craft-index">0{index + 1}</span>
                  <span className="craft-emoji">{craft.emoji}</span>
                  <span className="craft-label">{craft.label}</span>
                  <span className="craft-blurb">{craft.blurb}</span>
                </button>
              ))}
            </div>
            <StepActions back={back} next={next} />
          </div>
        )}

        {step === "sound" && (
          <div className="step sound-step">
            <div className="eyebrow">04 // SET YOUR PROFILE SIGNAL</div>
            <h2 className="display">What’s playing in your space?</h2>
            <p className="lede">
              Optional, but encouraged. Pin a favorite song now or upload tracks from your page
              later.
            </p>
            <div className="sound-setup-panel">
              <div className="disc-art" aria-hidden="true">
                <i />
                <b>♪</b>
              </div>
              <div>
                <label className="field">
                  <span>Favorite song / track</span>
                  <input
                    value={favoriteSongTitle}
                    onChange={(e) => setFavoriteSongTitle(e.target.value)}
                    placeholder="Artist — Track title"
                  />
                </label>
                <label className="field">
                  <span>
                    Direct audio URL <small>(optional)</small>
                  </span>
                  <input
                    type="url"
                    value={favoriteSongUrl}
                    onChange={(e) => setFavoriteSongUrl(e.target.value)}
                    placeholder="https://…/track.mp3"
                  />
                </label>
                <p className="field-note">
                  This becomes your profile song and the first track in your rave room. Browser
                  autoplay rules may ask visitors to press play.
                </p>
              </div>
            </div>
            <StepActions back={back} next={next} />
          </div>
        )}

        {step === "about" && (
          <div className="step">
            <div className="eyebrow">05 // TRANSMIT SOMETHING HUMAN</div>
            <h2 className="display">Leave a note at the door.</h2>
            <p className="lede">
              Who are you, what are you making, and what do you hope people notice?
            </p>
            <textarea
              className="about-input"
              value={about}
              onChange={(e) => setAbout(e.target.value)}
              rows={6}
              placeholder="I paint small things very large…"
            />
            <div className="prompt-chips">
              <span>current obsession?</span>
              <span>open to collabs?</span>
              <span>where are you based?</span>
            </div>
            <div className="step-actions">
              <button type="button" className="btn ghost" onClick={back}>
                ← Back
              </button>
              <button type="button" className="btn primary" onClick={finish}>
                Open my space ↗
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function StepActions({
  back,
  next,
  disabled = false,
}: {
  back: () => void;
  next: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="step-actions">
      <button type="button" className="btn ghost" onClick={back}>
        ← Back
      </button>
      <button type="button" className="btn primary" onClick={next} disabled={disabled}>
        Continue ↗
      </button>
    </div>
  );
}
