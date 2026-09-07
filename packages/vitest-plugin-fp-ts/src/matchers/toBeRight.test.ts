import * as E from "fp-ts/Either";
import { describe, expect, it } from "vite-plus/test";

import "../vitest.ts";

describe("toBeRight", () => {
  it("引数なしでRightを通過する", () => {
    expect(E.right(1)).toBeRight();
  });

  it("等しい値で通過する", () => {
    expect(E.right({ a: 1 })).toBeRight({ a: 1 });
  });

  it("異なる値で失敗する", () => {
    expect(() => expect(E.right(1)).toBeRight(2)).toThrow();
  });

  it("Leftで失敗する", () => {
    expect(() => expect(E.left("err")).toBeRight()).toThrow();
  });

  it("Eitherでない値で失敗する", () => {
    expect(() => expect(1).toBeRight()).toThrow();
    expect(() => expect(null).toBeRight()).toThrow();
  });

  it("notで反転する", () => {
    expect(E.left("err")).not.toBeRight();
  });
});
