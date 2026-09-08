import * as E from "fp-ts/Either";
import { describe, expect, it } from "vite-plus/test";

import "../vite-plus.ts";

describe("toBeRight", () => {
  it("引数なしでRightを通過する", () => {
    expect(E.right(1)).toBeRight();
  });

  it("等しい値で通過する", () => {
    expect(E.right({ a: 1 })).toBeRight({ a: 1 });
  });

  it("異なる値で失敗する", () => {
    expect(() => expect(E.right(1)).toBeRight(2)).toThrow(
      "Expected Right to equal",
    );
  });

  it("undefinedとの比較を区別する", () => {
    expect(E.right(undefined)).toBeRight();
    expect(E.right(undefined)).toBeRight(undefined);
    expect(() => expect(E.right(1)).toBeRight(undefined)).toThrow(
      "Expected Right to equal",
    );
    expect(E.right(1)).not.toBeRight(undefined);
  });

  it("Leftで失敗する", () => {
    expect(() => expect(E.left("err")).toBeRight()).toThrow(
      "Expected Right, but received Left",
    );
  });

  it("Eitherでない値で失敗する", () => {
    expect(() => expect(1).toBeRight()).toThrow(
      "Received value must be an fp-ts Either",
    );
    expect(() => expect(null).toBeRight()).toThrow(
      "Received value must be an fp-ts Either",
    );
    expect(() => expect({}).toBeRight()).toThrow(
      "Received value must be an fp-ts Either",
    );
  });

  it("notで反転する", () => {
    expect(E.left("err")).not.toBeRight();
    expect(() => expect(E.right(1)).not.toBeRight()).toThrow(
      "Expected value not to be Right",
    );
    expect(() => expect(E.right(1)).not.toBeRight(1)).toThrow(
      "Expected Right not to equal",
    );
  });
});
