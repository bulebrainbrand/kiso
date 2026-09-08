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
    expect(() => expect(E.left("")).toBeLeftWith((s) => s.length > 0)).toThrow(
      "Expected Left value to satisfy predicate",
    );
  });

  it("Rightでは述語を呼ばず失敗する", () => {
    const predicate = vi.fn(() => true);
    expect(() => expect(E.right(1)).toBeLeftWith(predicate)).toThrow(
      "Expected Left, but received Right",
    );
    expect(predicate).not.toHaveBeenCalled();
  });

  it("Eitherでない値では述語を呼ばず失敗する", () => {
    const predicate = vi.fn(() => true);
    expect(() => expect(null).toBeLeftWith(predicate)).toThrow(
      "Received value must be an fp-ts Either",
    );
    expect(() => expect({}).toBeLeftWith(predicate)).toThrow(
      "Received value must be an fp-ts Either",
    );
    expect(predicate).not.toHaveBeenCalled();
  });

  it("述語が関数でない場合は失敗する", () => {
    expect(() =>
      expect(E.left("err")).toBeLeftWith(
        "not a function" as unknown as () => boolean,
      ),
    ).toThrow("Predicate must be a function");
  });

  it("述語が関数でなくreceivedも不正な場合は述語エラーが優先される", () => {
    expect(() =>
      expect(null).toBeLeftWith("not a function" as unknown as () => boolean),
    ).toThrow("Predicate must be a function");
  });

  it("notで反転する", () => {
    expect(E.left("")).not.toBeLeftWith((s) => s.length > 0);
  });
});
