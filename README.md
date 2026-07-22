# ourspace

A portfolio-first social platform for artists and creators. People build a
low-poly avatar, assemble a personal page from creative modules, and step into
walkable galleries and music rooms. Discovery happens by visiting people and
their worlds—not by scrolling an engagement feed.

The current build is a local-first prototype. Profiles are stored in the
browser, so no database, account service, API key, or `.env` file is required.

## What works now

- Six-step account questionnaire and PS1/PS2-inspired avatar builder
- Editable profile modules for artwork, music, moodboards, and text
- Favorite song and playlist support
- Third-person gallery rooms and creator-DJ rave rooms
- A continuous flight into a planet-style creator discovery hub
- Friends, similar, opposite, random, and new-person discovery filters
- Responsive desktop and mobile layouts

## Run it locally

### 1. Install the prerequisites

- [Node.js](https://nodejs.org/) 20 or newer
- pnpm 9.15.9

If pnpm is not installed, run:

```bash
npm install --global pnpm@9.15.9
```

### 2. Clone and start the project

```bash
git clone https://github.com/madirewolf/ourspace.git
cd ourspace
pnpm install
pnpm dev
```

Open the local URL printed in the terminal. It will normally be:

```text
http://localhost:5173/
```

If port 5173 is already occupied, Vite prints a different port. Use the URL it
prints instead.

### 3. Create a profile

Choose **Create your space** and complete the questionnaire. The generated
profile is saved to that browser's local storage. It is safe to refresh, but it
will not automatically appear in another browser or on another computer.

For a pre-filled development profile, open:

```text
http://localhost:5173/?demo=1
```

Demo mode is temporary and does not overwrite the profile saved in the browser.

## Useful commands

Run these from the repository root:

```bash
pnpm dev           # start the Vite development server
pnpm typecheck     # run strict TypeScript checks in every workspace
pnpm lint          # run ESLint
pnpm format:check  # check Prettier formatting
pnpm test          # run the Vitest suite
pnpm build         # create a production build
```

Before sharing a branch or pull request, run:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

## Project structure

| Path              | Purpose                                                      |
| ----------------- | ------------------------------------------------------------ |
| `apps/web`        | React, Vite, and react-three-fiber client                    |
| `apps/presence`   | Stub for future multiplayer presence and lobbies             |
| `packages/core`   | Pure TypeScript profile/avatar documents and archetype logic |
| `packages/avatar` | Runtime-generated low-poly avatar renderer                   |
| `packages/ui`     | Shared interface components                                  |
| `docs`            | Architecture decisions and product notes                     |

## How the prototype stores data

- Profiles currently live in browser `localStorage`.
- Uploaded audio uses session-only browser URLs and may need to be re-added
  after reopening the browser.
- The discoverable creator catalog is seeded prototype data.
- There is no production authentication or remote database yet.

The planned backend phase will replace these local-only pieces with real
accounts, storage, and published profile URLs.

## Working on the project

Read [AGENTS.md](AGENTS.md) for the product principles and engineering
conventions before making larger changes. In particular:

- Keep the product profile-first, never feed-first.
- Keep `packages/core` deterministic and free of browser or Three.js code.
- Use short-lived branches and Conventional Commit messages.
- Do not add dependencies without documenting why they are needed.

## Troubleshooting

**`pnpm` is not recognized**

Install the pinned version with `npm install --global pnpm@9.15.9`, close and
reopen the terminal, then run `pnpm install` again.

**The page is blank or the 3D scene is very slow**

Use a current version of Chrome, Edge, Firefox, or Safari and make sure hardware
acceleration/WebGL is enabled.

**The wrong project opens on localhost**

Check the URL printed by `pnpm dev`. Another project may already be using port
5173, in which case ourspace will start on the next available port.

**A clean profile is needed for testing**

Use a private/incognito window or clear this site's local storage in the
browser's developer tools.
