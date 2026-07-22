import { useState } from "react";
import { CRAFTS, createRng, modulesForCrafts, type AvatarDoc, type ProfileDoc } from "@atrium/core";
import { randomAvatar } from "@atrium/avatar";
import { makeId } from "../ids";
import { sampleArt } from "../sampleArt";
import { useApp } from "../store";
import { AvatarBuilder } from "./AvatarBuilder";

type Step = "welcome" | "identity" | "avatar" | "crafts" | "about";
const STEPS: Step[] = ["welcome", "identity", "avatar", "crafts", "about"];

/** Seed starter content so a fresh profile (and its gallery) is never empty. */
export function assembleProfile(
  name: string,
  username: string,
  about: string,
  avatar: AvatarDoc,
  crafts: string[],
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
  return { version: 1, name, username, about, avatar, crafts, modules };
}

export function Onboarding() {
  const createProfile = useApp((s) => s.createProfile);
  const [step, setStep] = useState<Step>("welcome");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [avatar, setAvatar] = useState<AvatarDoc | null>(null);
  const [crafts, setCrafts] = useState<string[]>([]);
  const [about, setAbout] = useState("");

  const stepIndex = STEPS.indexOf(step);

  const next = () => {
    if (step === "identity" && avatar === null) {
      // First visit to the builder: the username deterministically seeds a
      // starting look — same name, same little person, anywhere.
      setAvatar(randomAvatar(createRng(`atrium:avatar:v1:${username || name}`)));
    }
    const upcoming = STEPS[stepIndex + 1];
    if (upcoming) setStep(upcoming);
  };
  const back = () => {
    const previous = STEPS[stepIndex - 1];
    if (previous) setStep(previous);
  };

  const finish = () => {
    if (!avatar) return;
    createProfile(assembleProfile(name.trim(), username.trim(), about.trim(), avatar, crafts));
  };

  const toggleCraft = (id: string) =>
    setCrafts((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));

  return (
    <div className="onboarding">
      <div className="onboarding-card">
        <div className="progress">
          {STEPS.map((s, i) => (
            <span key={s} className={`dot${i <= stepIndex ? " filled" : ""}`} />
          ))}
        </div>

        {step === "welcome" && (
          <div className="step">
            <h1 className="display">Make yourself at home.</h1>
            <p className="lede">
              This is your atrium — a page that is actually yours. Build a little you, tell us what
              you make, and we'll set up the rooms. You can rearrange all of it later.
            </p>
            <div className="step-actions">
              <button type="button" className="btn primary" onClick={next}>
                Start →
              </button>
            </div>
          </div>
        )}

        {step === "identity" && (
          <div className="step">
            <h2 className="display">Who's moving in?</h2>
            <label className="field">
              <span>Name</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Sam Ellery"
                autoFocus
              />
            </label>
            <label className="field">
              <span>Username</span>
              <input
                value={username}
                onChange={(e) =>
                  // Any letters or numbers, any script — artists are global.
                  setUsername(e.target.value.toLowerCase().replace(/[^\p{L}\p{N}\-_.]/gu, ""))
                }
                placeholder="samellery"
              />
              <span className="field-hint">letters, numbers, dots and dashes — any language</span>
            </label>
            <div className="step-actions">
              <button type="button" className="btn" onClick={back}>
                ← Back
              </button>
              <button
                type="button"
                className="btn primary"
                onClick={next}
                disabled={name.trim() === "" || username.trim() === ""}
              >
                Next →
              </button>
            </div>
          </div>
        )}

        {step === "avatar" && avatar && (
          <div className="step wide">
            <h2 className="display">Build your little you.</h2>
            <p className="lede">This is who walks the galleries.</p>
            <AvatarBuilder value={avatar} onChange={setAvatar} />
            <div className="step-actions">
              <button type="button" className="btn" onClick={back}>
                ← Back
              </button>
              <button type="button" className="btn primary" onClick={next}>
                Next →
              </button>
            </div>
          </div>
        )}

        {step === "crafts" && (
          <div className="step">
            <h2 className="display">What do you make?</h2>
            <p className="lede">
              Pick everything that applies — your page starts with the rooms to match.
            </p>
            <div className="crafts">
              {CRAFTS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={`craft${crafts.includes(c.id) ? " selected" : ""}`}
                  onClick={() => toggleCraft(c.id)}
                >
                  <span className="craft-emoji">{c.emoji}</span>
                  <span className="craft-label">{c.label}</span>
                  <span className="craft-blurb">{c.blurb}</span>
                </button>
              ))}
            </div>
            <div className="step-actions">
              <button type="button" className="btn" onClick={back}>
                ← Back
              </button>
              <button type="button" className="btn primary" onClick={next}>
                Next →
              </button>
            </div>
          </div>
        )}

        {step === "about" && (
          <div className="step">
            <h2 className="display">Say hi.</h2>
            <p className="lede">A few lines about you, for the top of your page.</p>
            <textarea
              className="about-input"
              value={about}
              onChange={(e) => setAbout(e.target.value)}
              rows={4}
              placeholder="I paint small things very large…"
            />
            <div className="step-actions">
              <button type="button" className="btn" onClick={back}>
                ← Back
              </button>
              <button type="button" className="btn primary" onClick={finish}>
                Open my page →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
