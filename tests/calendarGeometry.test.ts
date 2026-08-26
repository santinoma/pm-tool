import { describe, expect, it } from "vitest";
import {
  snapMinutes,
  minutesToTopPx,
  pxToMinutes,
  minutesToHeightPx,
  resolveDragRange,
  moveBlock,
  resizeBlock,
  formatMinutesAsTime,
} from "../src/tenant/timeTracking/calendarGeometry";

describe("snapMinutes", () => {
  it("snaps to the nearest 15-minute step", () => {
    expect(snapMinutes(7)).toBe(0);
    expect(snapMinutes(8)).toBe(15);
    expect(snapMinutes(22)).toBe(15);
    expect(snapMinutes(23)).toBe(30);
  });
});

describe("pixel/minute conversions", () => {
  it("round-trips minutes to px and back at 48px/hour", () => {
    expect(minutesToTopPx(60, 48)).toBe(48);
    expect(minutesToTopPx(90, 48)).toBe(72);
    expect(pxToMinutes(48, 48)).toBe(60);
  });

  it("computes bar height proportional to duration", () => {
    expect(minutesToHeightPx(30, 48)).toBe(24);
    expect(minutesToHeightPx(60, 48)).toBe(48);
  });
});

describe("resolveDragRange", () => {
  it("orders start/end regardless of drag direction", () => {
    expect(resolveDragRange(600, 540)).toEqual({ startMinutes: 540, endMinutes: 600 });
    expect(resolveDragRange(540, 600)).toEqual({ startMinutes: 540, endMinutes: 600 });
  });

  it("enforces the minimum duration when dragged range is too short", () => {
    expect(resolveDragRange(600, 605)).toEqual({ startMinutes: 600, endMinutes: 615 });
  });

  it("clamps to the 0..1440 day boundary", () => {
    expect(resolveDragRange(-30, 10)).toEqual({ startMinutes: 0, endMinutes: 15 });
    expect(resolveDragRange(1430, 1450)).toEqual({ startMinutes: 1425, endMinutes: 1440 });
  });
});

describe("moveBlock", () => {
  it("shifts both edges by the same snapped delta, preserving duration", () => {
    expect(moveBlock(600, 660, 20)).toEqual({ startMinutes: 615, endMinutes: 675 });
  });

  it("does not let the block move before midnight", () => {
    expect(moveBlock(10, 40, -100)).toEqual({ startMinutes: 0, endMinutes: 30 });
  });

  it("does not let the block move past the end of the day", () => {
    expect(moveBlock(1400, 1430, 100)).toEqual({ startMinutes: 1410, endMinutes: 1440 });
  });
});

describe("resizeBlock", () => {
  it("resizes only the start edge, keeping the end fixed", () => {
    expect(resizeBlock(600, 660, "start", 615)).toEqual({ startMinutes: 615, endMinutes: 660 });
  });

  it("resizes only the end edge, keeping the start fixed", () => {
    expect(resizeBlock(600, 660, "end", 705)).toEqual({ startMinutes: 600, endMinutes: 705 });
  });

  it("refuses to shrink below the minimum duration", () => {
    expect(resizeBlock(600, 660, "start", 655)).toEqual({ startMinutes: 645, endMinutes: 660 });
    expect(resizeBlock(600, 660, "end", 605)).toEqual({ startMinutes: 600, endMinutes: 615 });
  });
});

describe("formatMinutesAsTime", () => {
  it("formats minutes-since-midnight as HH:MM", () => {
    expect(formatMinutesAsTime(0)).toBe("00:00");
    expect(formatMinutesAsTime(90)).toBe("01:30");
    expect(formatMinutesAsTime(600)).toBe("10:00");
  });
});
