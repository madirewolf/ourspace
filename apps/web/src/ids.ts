/** Mint a stable unique id. Lives in the app (not core) — core stays pure. */
export function makeId(): string {
  return crypto.randomUUID().slice(0, 13);
}
