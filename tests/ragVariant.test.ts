import { describe, expect, it } from "vitest";
import { ragVariantForUsagePercent } from "@/ui/nextelite/ragVariant";

describe("ragVariantForUsagePercent (T504)", () => {
  it("returns success below the warn threshold", () => {
    expect(ragVariantForUsagePercent(0)).toBe("success");
    expect(ragVariantForUsagePercent(79.9)).toBe("success");
  });

  it("returns warning at and above the warn threshold, up to 100%", () => {
    expect(ragVariantForUsagePercent(80)).toBe("warning");
    expect(ragVariantForUsagePercent(95)).toBe("warning");
    expect(ragVariantForUsagePercent(100)).toBe("warning");
  });

  it("returns destructive above 100%", () => {
    expect(ragVariantForUsagePercent(100.1)).toBe("destructive");
    expect(ragVariantForUsagePercent(263)).toBe("destructive");
  });

  it("respects a custom warnAt threshold", () => {
    expect(ragVariantForUsagePercent(85, 90)).toBe("success");
    expect(ragVariantForUsagePercent(90, 90)).toBe("warning");
  });
});
