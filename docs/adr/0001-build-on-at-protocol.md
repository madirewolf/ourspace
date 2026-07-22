# ADR 0001: Build on the AT Protocol

Status: accepted · Date: 2026-07-19

## Context

The product requires portable identity (principle 5), composable user-controlled
moderation (principle 2), and no central authority (principle 1). Candidates:
ActivityPub, Nostr, raw peer-to-peer, a bespoke protocol, or the AT Protocol.

## Decision

Build on the AT Protocol: DIDs for identity, self-hostable PDSs for storage,
custom record types under the `app.orbium.*` namespace, stackable labelers for
moderation.

## Consequences

- ActivityPub is rejected because it couples identity to instances and account
  migration is painful — this breaks principle 5 outright.
- Nostr is rejected for v1 because raw key management is too rough for the
  "welcoming by default" bar (principle 3).
- Raw peer-to-peer is a research project; a bespoke protocol is a multi-year
  detour. Neither ships M4.
- Labelers map directly onto "moderation is physics": skies compose filters,
  nothing is deleted network-wide.
- Heavy media can move to IPFS later without disturbing the spine; world
  documents stay small enough to live in PDS records regardless.
- We accept dependency on the atproto ecosystem's maturation pace; the
  worldgen/render core stays protocol-agnostic so the spine could be swapped.
