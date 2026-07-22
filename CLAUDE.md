Working title: Atrium (placeholder — see Naming at the bottom)

What this is

A portfolio-first social platform for artists and creators — the intersection
of LinkedIn and Instagram with forum features later, built to remove
liminality rather than farm engagement. Every person is represented by a
low-poly avatar they build themselves; every profile is a warm, curated page
of modules showing their work; and their image-based modules can be entered
as small 3D spaces, walked through in third person like a private gallery.
Reference feeling: https://thevertmenthe.dault-lafon.fr/ — quiet, personal,
the art is the point.

Product principles (non-negotiable)

1. Profile-first, never feed-first. The unit of the platform is a person's
   space, not a stream of content. Discovery happens by visiting people.
2. Warm, not liminal. Every surface should feel inhabited and intentional —
   a studio apartment, not an airport.
3. Documents are parameters, not meshes. An avatar is a compact JSON document
   (AvatarDoc); a profile is a compact JSON document (ProfileDoc). Rendering
   is deterministic on the client. Cheap to store, fast to sync, portable.
4. Archetypes are starting points, never cages. The onboarding quiz assembles
   a first profile; everything it builds can be rebuilt, mixed, or removed.
   A musician-painter stacks a music module on top of a painting module.
5. The work is the centerpiece. Modules present it; galleries stage it.
   Chrome stays out of the way.
6. PS2-era craft. Low-poly, flat-shaded, visible polygons — Mii charm with
   Final Fantasy sincerity. Never photoreal, never sterile.

Core concepts and vocabulary

- Avatar: the user's low-poly character, built during onboarding, defined by
  an AvatarDoc (skin, hair style/color, outfit colors, accessory).
- Profile: a person's page — avatar top-left, name/username, About Me, then
  their modules. Defined by a ProfileDoc.
- Module: one block of a profile — photos, music, moodboard, text. Typed,
  orderable, addable/removable at will.
- Archetype: the module set the onboarding quiz assembles from a person's
  crafts (musician, visual artist, photographer, writer, ...).
- Room: the walkable 3D rendering of a module — framed works on walls, the
  visitor's avatar in third person.
- Lobby (future): a shared room where multiple avatars hang out — groups,
  forums, co-browsing.

Architecture

Client (now)

- TypeScript, React, Vite; three.js via react-three-fiber, drei, zustand
- Local-first v0: ProfileDoc persists to localStorage; no accounts yet
- Avatars and rooms are built from primitives at runtime — no modeled
  assets, no GLTF pipeline yet; parameters in, geometry out
- Performance budget: 60 frames per second on a mid-range laptop, room
  scenes under 150 draw calls, profile page interactive in under 2 seconds

Backend (next, deliberately deferred)

- Likely Supabase (auth, Postgres, storage for images/audio) once the
  local-first experience is proven; profiles publish at /@username
- Forums and presence come after profiles work: apps/presence already
  sketches the ephemeral co-browsing contract (never persist location)

Repo layout (pnpm workspaces)

```
apps/
  web/            # Vite + React + react-three-fiber client
  presence/       # WebSocket presence server (future lobbies; stub)
packages/
  core/           # pure TypeScript: ProfileDoc/AvatarDoc types, archetype
                  # logic, seeded PRNG, color utils. No three.js, no DOM.
  avatar/         # react-three-fiber low-poly avatar built from AvatarDoc
  ui/             # shared 2D UI components
docs/             # design docs and architecture decision records (ADRs)
```

Conventions

- TypeScript strict mode everywhere. No `any` without an explanatory comment.
- Prettier and ESLint, enforced in continuous integration (CI).
- Conventional Commits: `feat:`, `fix:`, `chore:`, `refactor:`, `docs:`.
- Small pull requests (PRs), one reviewer minimum, no direct pushes to `main`.
- `packages/core` stays pure and deterministic: no `Math.random`, no clocks,
  no three.js, no DOM (enforced by ESLint). Seeded PRNG only, so a username
  can deterministically seed a default avatar.
- Every new dependency gets a one-line justification in the PR description.

Team workflow (GitHub CLI)

```bash
gh repo create <org>/<name> --private --clone
gh issue create -t "P1: avatar builder" -b "acceptance criteria..."
git switch -c feat/12-avatar-hair      # branch names reference issue numbers
gh pr create --fill
gh pr merge --squash
```

- Trunk-based development: short-lived branches off `main`, squash merges.
- Every task starts as an issue; PRs close issues via `Closes #N`.
- Tag releases `v0.x`; generate changelogs from commit history.

Roadmap

- P0 Pivot: this restructure — core/avatar packages, docs honored
- P1 A person: onboarding quiz + avatar-builder tutorial, profile page with
  editable modules (photos, music, moodboard, text), local persistence
- P2 A room: image modules walkable in third person — frames, captions,
  soft light, the vert-menthe feeling
- P3 Real accounts: backend, publish profiles at /@username, uploads in
  object storage, shareable links
- P4 Visiting: browse other people's profiles and rooms, follows, guestbook
- P5 Together: presence server lights up — avatars co-browse rooms, join
  groups and lobbies
- P6 Forums: communities with threads, avatar-native, moderation tools

Working agreement for Claude Code

- Read this file at the start of every session.
- Prefer small, reviewable diffs. Never commit directly to `main`.
- Run `pnpm typecheck && pnpm lint && pnpm test` before proposing any commit.
- Ask before adding dependencies or changing document schemas.
- Keep `packages/core` free of side effects and nondeterminism.
- When product direction is ambiguous, re-read Product principles and pick
  the warmer, more personal option.
- Claude Code docs, if needed: https://docs.claude.com/en/docs/claude-code/overview

Naming

Working title Atrium: the room of a house you walk into first, open to the
sky. Not user-confirmed — candidates welcome: Foyer, Vitrine, Parlor,
Alcove, Studiolo, Maquette. Verify trademark and domain availability before
any public launch. (Repo folder still says OurSpace; renaming the directory
is disruptive mid-session and cosmetic — do it whenever convenient.)
