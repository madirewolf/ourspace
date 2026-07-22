// The presence server arrives in M5 (see CLAUDE.md roadmap). The wire contract
// is sketched now so it can be reviewed before a framework (Hono vs Fastify)
// is chosen. Presence is ephemeral: never persist location history.

/** Rooms are keyed by the system or world being co-browsed. */
export type RoomKey = `system:${string}` | `world:${string}`;

export interface ShipState {
  did: string;
  position: [number, number, number];
  /** Unit quaternion. */
  orientation: [number, number, number, number];
}

export type PresenceMessage =
  | { kind: "join"; room: RoomKey; ship: ShipState }
  | { kind: "update"; ship: ShipState }
  | { kind: "point"; at: [number, number, number] }
  | { kind: "leave" };
