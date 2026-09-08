import * as O from "fp-ts/Option";
import { describe, expect, it } from "vite-plus/test";

import "../vite-plus.ts";

describe("toStrictEqualSome", () => {
  it("厳密に等しい値で通過する", () => {
    expect(O.some({ a: 1 })).toStrictEqualSome({ a: 1 });
  });

  it("非strictでは通るがstrictでは落ちる値で失敗する", () => {
    const received = O.some({ a: 1, b: undefined });
    expect(received).toBeSome({ a: 1 });
    expect(() => expect(received).toStrictEqualSome({ a: 1 })).toThrow();
  });

  it("Noneで失敗する", () => {
    expect(() => expect(O.none).toStrictEqualSome("err")).toThrow();
  });

  it("Optionでない値で失敗する", () => {
    expect(() => expect(1).toStrictEqualSome(1)).toThrow();
  });

  it("notで反転する", () => {
    expect(O.some(1)).not.toStrictEqualSome(2);
  });
});
