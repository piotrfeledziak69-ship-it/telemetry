import { describe, expect, it } from "vitest";
import { smoothRacingLine } from "./line-smooth";

describe("smoothRacingLine", () => {
  it("keeps point count and start point", () => {
    const pts = Array.from({ length: 20 }, (_, i) => ({ x: i % 2 ? 0.6 : 0.4, y: i / 20 }));
    const out = smoothRacingLine(pts);
    expect(out).toHaveLength(20);
    expect(out[0]).toEqual(pts[0]);
    expect(Math.abs(out[5].x - 0.5)).toBeLessThan(0.1);
  });
});
