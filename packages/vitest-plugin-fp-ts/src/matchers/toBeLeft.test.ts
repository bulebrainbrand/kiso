import * as E from "fp-ts/Either";
import { describe, expect, it } from "vite-plus/test";

import "../vite-plus.ts";

describe("toBeLeft", () => {
  it("引数なしでLeftを通過する", () => {
    expect(E.left("err")).toBeLeft();
  });

  it("等しい値で通過する", () => {
    expect(E.left({ code: "oops" })).toBeLeft({ code: "oops" });
  });

  it("異なる値で失敗する", () => {
    expect(() => expect(E.left("a")).toBeLeft("b")).toThrow(
      "Expected Left to equal",
    );
  });

  it("undefinedとの比較を区別する", () => {
    expect(E.left(undefined)).toBeLeft();
    expect(E.left(undefined)).toBeLeft(undefined);
    expect(() => expect(E.left("a")).toBeLeft(undefined)).toThrow(
      "Expected Left to equal",
    );
    expect(E.left("a")).not.toBeLeft(undefined);
  });

  it("Rightで失敗する", () => {
    expect(() => expect(E.right(1)).toBeLeft()).toThrow(
      "Expected Left, but received Right",
    );
  });

  it("Eitherでない値で失敗する", () => {
    expect(() => expect("left").toBeLeft()).toThrow(
      "Received value must be an fp-ts Either",
    );
    expect(() => expect(undefined).toBeLeft()).toThrow(
      "Received value must be an fp-ts Either",
    );
    expect(() => expect({}).toBeLeft()).toThrow(
      "Received value must be an fp-ts Either",
    );
  });

  it("notで反転する", () => {
    expect(E.right(1)).not.toBeLeft();
    expect(() => expect(E.left("err")).not.toBeLeft()).toThrow(
      "Expected value not to be Left",
    );
    expect(() => expect(E.left("a")).not.toBeLeft("a")).toThrow(
      "Expected Left not to equal",
    );
  });
});
