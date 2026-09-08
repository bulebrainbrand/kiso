import * as E from "fp-ts/Either";
import { describe, expect, it } from "vite-plus/test";

import "../vite-plus.ts";

describe("toStrictEqualLeft", () => {
  it("厳密に等しい値で通過する", () => {
    expect(E.left({ code: "oops" })).toStrictEqualLeft({ code: "oops" });
  });

  it("非strictでは通るがstrictでは落ちる値で失敗する", () => {
    const received = E.left({ code: "oops", detail: undefined });
    expect(received).toBeLeft({ code: "oops" });
    expect(() => expect(received).toStrictEqualLeft({ code: "oops" })).toThrow(
      "Expected Left to strictly equal",
    );
  });

  it("Rightで失敗する", () => {
    expect(() => expect(E.right(1)).toStrictEqualLeft(1)).toThrow(
      "Expected Left, but received Right",
    );
  });

  it("Eitherでない値で失敗する", () => {
    expect(() => expect(null).toStrictEqualLeft(null)).toThrow(
      "Received value must be an fp-ts Either",
    );
    expect(() => expect({}).toStrictEqualLeft(null)).toThrow(
      "Received value must be an fp-ts Either",
    );
  });

  it("notで反転する", () => {
    expect(E.left("a")).not.toStrictEqualLeft("b");
    expect(() => expect(E.left("a")).not.toStrictEqualLeft("a")).toThrow(
      "Expected Left not to strictly equal",
    );
  });
});
