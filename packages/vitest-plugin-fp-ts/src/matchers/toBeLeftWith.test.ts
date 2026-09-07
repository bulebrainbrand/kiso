import * as E from "fp-ts/Either";
import { describe, expect, expectTypeOf, it, vi } from "vite-plus/test";

import "../vite-plus.ts";

describe("toBeLeftWith", () => {
  it("述語の引数はLeftの中身の型に推論される", () => {
    expect(E.left("oops")).toBeLeftWith((s) => {
      expectTypeOf(s).toEqualTypeOf<string>();
      return s.length > 0;
    });
  });

  it("述語を満たすLeftを通過する", () => {
    expect(E.left("oops")).toBeLeftWith((s) => s.length > 0);
  });

  it("述語を満たさないLeftで失敗する", () => {
    expect(() =>
      expect(E.left("")).toBeLeftWith((s) => s.length > 0),
    ).toThrow();
  });

  it("Rightでは述語を呼ばず失敗する", () => {
    const predicate = vi.fn(() => true);
    expect(() => expect(E.right(1)).toBeLeftWith(predicate)).toThrow();
    expect(predicate).not.toHaveBeenCalled();
  });

  it("Eitherでない値では述語を呼ばず失敗する", () => {
    const predicate = vi.fn(() => true);
    expect(() => expect(null).toBeLeftWith(predicate)).toThrow();
    expect(predicate).not.toHaveBeenCalled();
  });

  it("notで反転する", () => {
    expect(E.left("")).not.toBeLeftWith((s) => s.length > 0);
  });
});
