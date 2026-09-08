import * as E from "fp-ts/Either";
import { describe, expect, it } from "vite-plus/test";

import "../vite-plus.ts";

describe("toStrictEqualRight", () => {
  it("厳密に等しい値で通過する", () => {
    expect(E.right({ a: 1 })).toStrictEqualRight({ a: 1 });
  });

  it("非strictでは通るがstrictでは落ちる値で失敗する", () => {
    const received = E.right({ a: 1, b: undefined });
    expect(received).toBeRight({ a: 1 });
    expect(() => expect(received).toStrictEqualRight({ a: 1 })).toThrow(
      "Expected Right to strictly equal",
    );
  });

  it("Leftで失敗する", () => {
    expect(() => expect(E.left("err")).toStrictEqualRight("err")).toThrow(
      "Expected Right, but received Left",
    );
  });

  it("Eitherでない値で失敗する", () => {
    expect(() => expect(1).toStrictEqualRight(1)).toThrow(
      "Received value must be an fp-ts Either",
    );
  });

  it("notで反転する", () => {
    expect(E.right(1)).not.toStrictEqualRight(2);
  });
});
