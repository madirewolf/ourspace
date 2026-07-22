# ADR 0002: Worlds are parameters, not meshes

Status: accepted · Date: 2026-07-19

## Context

A profile world must be cheap to store in a PDS record, fast to sync, portable
across servers, and identical for every viewer. Shipping geometry (meshes,
textures) fails all four: multi-megabyte records, slow cold loads, and no way
to verify what a server hands you.

## Decision

A world is a compact JSON document: a seed, a palette, terrain parameters, and
a list of placed objects. Every client regenerates the geometry locally and
deterministically. Concretely:

- `packages/worldgen` is pure TypeScript: same document in, byte-identical
  typed arrays out, on every machine. No three.js imports, no `Math.random`,
  no clocks — enforced by ESLint rules and property tests.
- Randomness comes only from a seeded PRNG (xmur3 seeding + sfc32), which uses
  integer math (`Math.imul`, shifts) and is therefore exact across platforms.
  Noise is simplex over that PRNG's permutation table.
- Floating-point determinism holds because IEEE 754 basic arithmetic is exactly
  specified; worldgen avoids transcendental library calls whose last-bit
  rounding may vary (`Math.sin` etc.) in favor of arithmetic, `Math.floor`,
  and `Math.sqrt` (correctly rounded per spec).

## Consequences

- World documents stay a few kilobytes; a whole system loads in one fetch.
- Reputation-as-geology (principle 3) becomes possible: age and richness are
  derived properties of the document, not claims.
- The renderer must rebuild geometry on document change; LOD tiers and caching
  keep this inside the cold-load budget (< 2 s).
- Any change to generation code is a breaking change to every world's
  appearance. Generation is versioned via the document's `version` field, and
  old versions must keep rendering identically (golden-hash tests).
