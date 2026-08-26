import { describe, expect, it } from "vitest";
import { hillPositionToCoords } from "../src/tenant/hillChart/geometry";

describe("hillPositionToCoords", () => {
  it("places position 0 at the left foot (y is minimal)", () => {
    const { x, y } = hillPositionToCoords(0, 300, 150);
    expect(x).toBe(0);
    expect(y).toBe(0);
  });

  it("places position 50 at the peak (y is maximal)", () => {
    const { x, y } = hillPositionToCoords(50, 300, 150);
    expect(x).toBe(150);
    expect(y).toBe(150);
  });

  it("places position 100 at the right foot (y is minimal)", () => {
    const { x, y } = hillPositionToCoords(100, 300, 150);
    expect(x).toBe(300);
    expect(y).toBe(0);
  });

  it("x increases monotonically with position", () => {
    const positions = [0, 10, 25, 40, 60, 75, 90, 100];
    const xs = positions.map((p) => hillPositionToCoords(p, 300, 150).x);
    for (let i = 1; i < xs.length; i++) {
      expect(xs[i]).toBeGreaterThan(xs[i - 1]);
    }
  });

  it("y increases going uphill (0->50) and decreases going downhill (50->100)", () => {
    const uphill = [0, 20, 40, 50].map((p) => hillPositionToCoords(p, 300, 150).y);
    for (let i = 1; i < uphill.length; i++) {
      expect(uphill[i]).toBeGreaterThan(uphill[i - 1]);
    }
    const downhill = [50, 60, 80, 100].map((p) => hillPositionToCoords(p, 300, 150).y);
    for (let i = 1; i < downhill.length; i++) {
      expect(downhill[i]).toBeLessThan(downhill[i - 1]);
    }
  });

  it("clamps out-of-range positions", () => {
    expect(hillPositionToCoords(-10, 300, 150).x).toBe(0);
    expect(hillPositionToCoords(150, 300, 150).x).toBe(300);
  });
});
