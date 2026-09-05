import { describe, expect, it } from "vite-plus/test";
import { computeDelay } from "./delay.ts";

describe("computeDelay", () => {
  it("fixed は常に initialDelayMs", () => {
    expect(computeDelay(0, 100, "fixed", undefined)).toBe(100);
    expect(computeDelay(3, 100, "fixed", undefined)).toBe(100);
  });

  it("exponential は 2^n 倍", () => {
    expect(computeDelay(0, 100, "exponential", undefined)).toBe(100);
    expect(computeDelay(1, 100, "exponential", undefined)).toBe(200);
    expect(computeDelay(2, 100, "exponential", undefined)).toBe(400);
  });

  it("maxDelayMs で頭打ちになる", () => {
    expect(computeDelay(5, 100, "exponential", 250)).toBe(250);
  });
});
