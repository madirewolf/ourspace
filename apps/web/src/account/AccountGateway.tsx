import { useState, type FormEvent } from "react";
import type { ProfileDoc } from "@ourspace/core";
import { useApp } from "../store";

interface AccountGatewayProps {
  profile: ProfileDoc | null;
  onCreate: () => void;
}

export function AccountGateway({ profile, onCreate }: AccountGatewayProps) {
  const signIn = useApp((s) => s.signIn);
  const [showLogin, setShowLogin] = useState(profile !== null);
  const [username, setUsername] = useState(profile?.username ?? "");
  const [error, setError] = useState("");

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!profile) {
      setError("No local account lives on this device yet. Create one first.");
      return;
    }
    if (username.trim().toLowerCase() !== profile.username.toLowerCase()) {
      setError(`This device only knows @${profile.username}.`);
      return;
    }
    signIn();
  };

  return (
    <main className="gateway-shell">
      <nav className="site-nav" aria-label="Main navigation">
        <a className="wordmark" href="#top" aria-label="ourspace home">
          our<span>space</span>
          <i>★</i>
        </a>
        <div className="nav-status">
          <span /> local signal online
        </div>
      </nav>

      <section className="gateway-hero" id="top">
        <div className="hero-copy">
          <div className="eyebrow">PORTFOLIOS FOR INTERNET PEOPLE // 2000—FOREVER</div>
          <h1>
            Your work.
            <br />
            Your world.
            <br />
            <em>Your space.</em>
          </h1>
          <p>
            Build a tiny digital home for everything you make. No feed to please—just your avatar,
            your rooms, and the people who came to see your work.
          </p>
          <div className="hero-actions">
            <button className="btn primary gateway-cta" type="button" onClick={onCreate}>
              {profile ? "Create a different space" : "Create your space"} <span>↗</span>
            </button>
            <button className="btn ghost" type="button" onClick={() => setShowLogin(true)}>
              Log in
            </button>
          </div>
          <div className="hero-proof">
            <span>✦ profile-first</span>
            <span>✦ no algorithm</span>
            <span>✦ built for artists</span>
          </div>
        </div>

        <div className="portal-stack" aria-label="Preview of an ourspace profile">
          <div className="portal-orbit orbit-one" />
          <div className="portal-orbit orbit-two" />
          <div className="portal-window">
            <div className="window-bar">
              <span>ourspace://you</span>
              <div>
                <i />
                <i />
                <i />
              </div>
            </div>
            <div className="portal-screen">
              <div className="pixel-person" aria-hidden="true">
                <span className="pixel-hair" />
                <span className="pixel-head" />
                <span className="pixel-body" />
                <span className="pixel-leg left" />
                <span className="pixel-leg right" />
              </div>
              <div className="portal-copy">
                <small>NOW VISITING</small>
                <strong>@yourname</strong>
                <div className="mini-module">
                  01 / WORKS <b>ENTER →</b>
                </div>
                <div className="mini-module hot">
                  02 / SOUNDS <b>PLAY ▶</b>
                </div>
              </div>
            </div>
          </div>
          <span className="sticker sticker-a">
            MAKE
            <br />
            IT
            <br />
            YOURS
          </span>
          <span className="sticker sticker-b">WWW.</span>
        </div>
      </section>

      <section className="gateway-ticker" aria-label="Platform features">
        <div>
          AVATAR BUILDER ✦ WALKABLE GALLERIES ✦ PROFILE SOUNDTRACKS ✦ CREATOR MOODBOARDS ✦ YOUR WORK
          IS THE POINT ✦
        </div>
      </section>

      <section className="gateway-values">
        <article>
          <span>01</span>
          <h2>A page, not a feed.</h2>
          <p>Curate a place people choose to visit. Nothing gets buried by an algorithm.</p>
        </article>
        <article>
          <span>02</span>
          <h2>Become low-poly.</h2>
          <p>Build a PS1-era you, then walk through image galleries and late-night sound rooms.</p>
        </article>
        <article>
          <span>03</span>
          <h2>Press play.</h2>
          <p>Pin a favorite song to your profile or take a whole playlist into the rave.</p>
        </article>
      </section>

      {showLogin && (
        <div className="auth-scrim" role="presentation" onMouseDown={() => setShowLogin(false)}>
          <section
            className="auth-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="login-title"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="window-bar">
              <span>secure_login.exe</span>
              <button type="button" onClick={() => setShowLogin(false)} aria-label="Close">
                ×
              </button>
            </div>
            <form onSubmit={submit}>
              <div className="auth-icon">↳</div>
              <p className="eyebrow">RETURN TO YOURSPACE</p>
              <h2 id="login-title">Log in locally</h2>
              <p className="auth-copy">
                Real cloud accounts arrive with the backend. For now, your profile is saved only in
                this browser.
              </p>
              <label className="field">
                <span>Username</span>
                <input
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    setError("");
                  }}
                  placeholder="yourname"
                  autoFocus
                />
              </label>
              {error && (
                <p className="auth-error" role="alert">
                  {error}
                </p>
              )}
              <button type="submit" className="btn primary">
                Enter ourspace ↗
              </button>
              <button type="button" className="auth-text-btn" onClick={onCreate}>
                {profile ? "Create a different local account" : "No account? Create your space."}
              </button>
              {profile && (
                <p className="auth-copy">
                  Completing setup replaces @{profile.username} on this browser. You can exit setup
                  before the final step without changing anything.
                </p>
              )}
            </form>
          </section>
        </div>
      )}
    </main>
  );
}
