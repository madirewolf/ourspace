import { describe, expect, it } from "vitest";
import { CRAFTS, modulesForCrafts } from "../src/archetypes";
import { hexToRgb, readableAccent, rgbToHex, rgbToHsl, shiftHue } from "../src/color";

function idMinter(): () => string {
  let n = 0;
  return () => `id-${n++}`;
}

describe("modulesForCrafts", () => {
  it("gives a musician-painter both modules, stacked", () => {
    const modules = modulesForCrafts(["visual", "music"], idMinter());
    const kinds = modules.map((m) => m.kind);
    expect(kinds).toContain("photos");
    expect(kinds).toContain("music");
    expect(kinds[kinds.length - 1]).toBe("moodboard");
  });

  it("always includes a moodboard", () => {
    for (const craft of CRAFTS) {
      const modules = modulesForCrafts([craft.id], idMinter());
      expect(modules.some((m) => m.kind === "moodboard")).toBe(true);
    }
  });

  it("gives an undecided person somewhere to put work anyway", () => {
    const modules = modulesForCrafts([], idMinter());
    expect(modules.some((m) => m.kind === "photos")).toBe(true);
    expect(modules.some((m) => m.kind === "moodboard")).toBe(true);
  });

  it("mints unique ids", () => {
    const modules = modulesForCrafts(
      CRAFTS.map((c) => c.id),
      idMinter(),
    );
    const ids = modules.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("color", () => {
  it("hex round-trips through rgb", () => {
    for (const hex of ["#000000", "#ffffff", "#f6d7b0", "#5a8f3d", "#123456"]) {
      expect(rgbToHex(hexToRgb(hex))).toBe(hex);
    }
  });

  it("shiftHue(0) is identity within rounding", () => {
    expect(shiftHue("#8a6fc0", 0)).toBe("#8a6fc0");
  });

  it("readableAccent darkens light colors enough for light text", () => {
    for (const hex of ["#f2ede4", "#e8c84a", "#ffffff", "#57a773"]) {
      const [, , l] = rgbToHsl(hexToRgb(readableAccent(hex)));
      expect(l).toBeLessThanOrEqual(0.45);
    }
  });
});
