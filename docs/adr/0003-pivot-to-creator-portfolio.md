# ADR 0003: Pivot from decentralized planet network to creator portfolio

Status: accepted · Date: 2026-07-20 · Supersedes: 0001 (in part), reframes 0002

## Context

The original product (OurSpace) was a decentralized social network where
profiles were procedural planets on the AT Protocol. On 2026-07-20 the
product direction changed: a portfolio-first platform for artists and
creators — avatar-driven profiles with composable work modules, walkable 3D
galleries, and eventually forums and avatar lobbies.

## Decision

- Drop the AT Protocol spine for now (ADR 0001 no longer governs; a
  conventional backend, likely Supabase, arrives in P3). Decentralization
  may return later; nothing in the document model precludes it.
- Keep the load-bearing idea of ADR 0002 — documents are parameters, not
  meshes — and re-aim it: AvatarDoc and ProfileDoc are compact JSON,
  rendered deterministically on the client. The seeded PRNG, color utilities,
  and purity discipline move from `packages/worldgen` to `packages/core`.
- Remove `packages/worldgen` (planet generation), `packages/render` (planet
  rendering), and `packages/lexicons` (AT Protocol schemas). The M1 planet
  remains in git history (`feat/2-m1-deterministic-planet`).
- Keep `apps/presence` as a stub: avatar lobbies still want ephemeral
  presence with the same never-persist-location rule.

## Consequences

- The pnpm/TS/ESLint/CI scaffold, r3f stack, and determinism tests carry
  over intact — the pivot costs docs and package moves, not infrastructure.
- Auth, storage, and social features become ordinary backend work instead of
  protocol work, at the price of centralization (revisit post-P4).
- The PS2-low-poly aesthetic becomes a stated product principle, so visual
  decisions have a reference point.
