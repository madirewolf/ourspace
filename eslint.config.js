import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import prettier from "eslint-config-prettier";
import globals from "globals";

export default tseslint.config(
  { ignores: ["**/dist/**", "**/node_modules/**", "**/coverage/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
  },
  {
    files: ["**/*.tsx"],
    plugins: { "react-hooks": reactHooks },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
  {
    // core must be pure and deterministic (CLAUDE.md): no entropy, no clocks,
    // no three.js, no DOM. Glob covers every JS/TS flavor so nothing slips
    // through via an .mts/.tsx side door.
    files: ["packages/core/src/**/*.{ts,tsx,mts,cts,js,mjs,cjs}"],
    rules: {
      "no-restricted-properties": [
        "error",
        {
          object: "Math",
          property: "random",
          message: "core is deterministic: use the seeded PRNG (createRng).",
        },
        {
          object: "Date",
          property: "now",
          message: "core is deterministic: no clocks.",
        },
        {
          object: "performance",
          property: "now",
          message: "core is deterministic: no clocks.",
        },
      ],
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["three", "three/*", "react", "react-*"],
              message: "core stays pure TypeScript — no three.js, no React (CLAUDE.md).",
            },
          ],
        },
      ],
      "no-restricted-globals": [
        "error",
        { name: "document", message: "core has no DOM." },
        { name: "window", message: "core has no DOM." },
        { name: "localStorage", message: "core has no DOM." },
      ],
    },
  },
  prettier,
);
