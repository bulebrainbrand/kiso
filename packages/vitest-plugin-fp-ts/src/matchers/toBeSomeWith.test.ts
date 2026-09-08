import * as O from "fp-ts/Option";
import { describe, expect, expectTypeOf, it, vi } from "vite-plus/test";

import "../vite-plus.ts";

describe("toBeSomeWith", () => {
  it("述語の引数はSomeの中身の型に推論される", () => {
    expect(O.some(2)).toBeSomeWith((n) => {
      expectTypeOf(n).toEqualTypeOf<number>();
      return n > 1;
    });
  });

  it("述語を満たすSomeを通過する", () => {
    expect(O.some(2)).toBeSomeWith((n) => n > 1);
  });

  it("述語を満たさないSomeで失敗する", () => {
    expect(() => expect(O.some(0)).toBeSomeWith((n) => n > 1)).toThrow();
  });

  it("Noneでは述語を呼ばず失敗する", () => {
    const predicate = vi.fn(() => true);
    expect(() => expect(O.none).toBeSomeWith(predicate)).toThrow();
    expect(predicate).not.toHaveBeenCalled();
  });

  it("Optionでない値では述語を呼ばず失敗する", () => {
    const predicate = vi.fn(() => true);
    expect(() => expect(1).toBeSomeWith(predicate)).toThrow();
    expect(predicate).not.toHaveBeenCalled();
  });

  it("notで反転する", () => {
    expect(O.some(0)).not.toBeSomeWith((n) => n > 1);
  });
});
