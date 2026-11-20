import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Vite configs run in Node, but this workspace deliberately has no @types/node
// (the app itself is browser-only), so declare just the bit we read.
declare const process: { env: Record<string, string | undefined> };

const port = Number(process.env.PORT);

export default defineConfig({
  plugins: [react()],
  server: {
    // Honor a harness-/env-assigned port; fall back to 5173 for `pnpm dev`.
    // strictPort stays off so Vite hops to the next free port if 5173 is busy.
    port: Number.isFinite(port) && port > 0 ? port : 5173,
  },
});
