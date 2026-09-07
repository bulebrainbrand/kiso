import * as E from "fp-ts/Either";
import { describe, expect, it, vi } from "vite-plus/test";

import "../vitest.ts";

describe("toBeRightWith", () => {
  it("述語を満たすRightを通過する", () => {
    expect(E.right(2)).toBeRightWith((n) => n > 1);
  });

  it("述語を満たさないRightで失敗する", () => {
    expect(() => expect(E.right(0)).toBeRightWith((n) => n > 1)).toThrow();
  });

  it("Leftでは述語を呼ばず失敗する", () => {
    const predicate = vi.fn(() => true);
    expect(() => expect(E.left("err")).toBeRightWith(predicate)).toThrow();
    expect(predicate).not.toHaveBeenCalled();
  });

  it("Eitherでない値では述語を呼ばず失敗する", () => {
    const predicate = vi.fn(() => true);
    expect(() => expect(1).toBeRightWith(predicate)).toThrow();
    expect(predicate).not.toHaveBeenCalled();
  });

  it("notで反転する", () => {
    expect(E.right(0)).not.toBeRightWith((n) => n > 1);
  });
});
