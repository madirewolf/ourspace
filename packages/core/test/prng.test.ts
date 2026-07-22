import { describe, expect, it } from "vitest";
import { createRng, pick, randInt, randRange } from "../src/prng";

describe("createRng", () => {
  it("produces identical sequences for identical seeds", () => {
    const a = createRng("copernicus");
    const b = createRng("copernicus");
    for (let i = 0; i < 1000; i++) {
      expect(a()).toBe(b());
    }
  });

  it("produces different sequences for different seeds", () => {
    const a = createRng("copernicus");
    const b = createRng("kepler");
    const streamA = Array.from({ length: 8 }, () => a());
    const streamB = Array.from({ length: 8 }, () => b());
    expect(streamA).not.toEqual(streamB);
  });

  it("stays in [0, 1) with a sane mean", () => {
    const rng = createRng("uniformity");
    let sum = 0;
    for (let i = 0; i < 10_000; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
      sum += v;
    }
    expect(sum / 10_000).toBeCloseTo(0.5, 1);
  });

  it("is stable across releases (golden values)", () => {
    const rng = createRng("copernicus");
    expect(Array.from({ length: 4 }, () => rng())).toMatchSnapshot();
  });
});

describe("helpers", () => {
  it("randRange stays inside its bounds", () => {
    const rng = createRng("range");
    for (let i = 0; i < 1000; i++) {
      const v = randRange(rng, -3, 7);
      expect(v).toBeGreaterThanOrEqual(-3);
      expect(v).toBeLessThan(7);
    }
  });

  it("randInt covers its inclusive bounds", () => {
    const rng = createRng("int");
    const seen = new Set<number>();
    for (let i = 0; i < 1000; i++) {
      const v = randInt(rng, 1, 4);
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(4);
      seen.add(v);
    }
    expect(seen).toEqual(new Set([1, 2, 3, 4]));
  });

  it("pick only returns members and throws on empty", () => {
    const rng = createRng("pick");
    const items = ["a", "b", "c"] as const;
    for (let i = 0; i < 100; i++) {
      expect(items).toContain(pick(rng, items));
    }
    expect(() => pick(rng, [])).toThrow();
  });
});
