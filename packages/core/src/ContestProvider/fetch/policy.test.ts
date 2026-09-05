import { describe, expect, it } from "vite-plus/test";
import { isRetryableStatus } from "./policy.ts";

describe("isRetryableStatus", () => {
  it("配列指定で判定する", () => {
    expect(isRetryableStatus(500, [500, 503])).toBe(true);
    expect(isRetryableStatus(400, [500, 503])).toBe(false);
  });

  it("関数指定で判定する", () => {
    expect(isRetryableStatus(500, () => true)).toBe(true);
    expect(isRetryableStatus(500, () => false)).toBe(false);
  });
});
