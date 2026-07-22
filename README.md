# Atrium (working title)

_Make yourself at home._

A portfolio-first social platform for artists and creators. Build a low-poly
avatar, answer a few questions about what you make, and get a warm personal
page of modules — your photography, your music, your moodboard. Image modules
open into small 3D rooms you can walk through in third person, like a private
gallery of your own work.

LinkedIn × Instagram energy, forum features later, liminality removed on
purpose. PS2-era aesthetics: visible polygons, flat shading, Mii charm.

## Status

**P1 — A person.** Onboarding quiz + avatar builder, editable profile
modules, and the first walkable gallery room. Local-first: everything
persists in your browser. See the [roadmap](CLAUDE.md#roadmap).

## Quickstart

```bash
pnpm install
pnpm dev          # opens the web client at http://localhost:5173
```

## Repository layout

| Path              | What it is                                                           |
| ----------------- | -------------------------------------------------------------------- |
| `apps/web`        | Vite + React + react-three-fiber client                              |
| `apps/presence`   | WebSocket presence server (future avatar lobbies; stub)              |
| `packages/core`   | Pure TS: ProfileDoc/AvatarDoc types, archetypes, seeded PRNG, no DOM |
| `packages/avatar` | Low-poly react-three-fiber avatar built from AvatarDoc parameters    |
| `packages/ui`     | Shared 2D UI components                                              |
| `docs/`           | Design docs and architecture decision records                        |

## Commands

```bash
pnpm dev          # run the web client
pnpm typecheck    # strict TypeScript, all workspaces
pnpm lint         # ESLint (core has extra purity rules)
pnpm test         # vitest
pnpm build        # production build
```

## Contributing

Read [CLAUDE.md](CLAUDE.md) first — product principles are non-negotiable.
Trunk-based development, Conventional Commits, every dependency justified.
