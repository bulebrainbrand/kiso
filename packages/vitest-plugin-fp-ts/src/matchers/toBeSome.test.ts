import * as O from "fp-ts/Option";
import { describe, expect, it } from "vite-plus/test";

import "../vite-plus.ts";

describe("toBeSome", () => {
  it("引数なしでSomeを通過する", () => {
    expect(O.some(1)).toBeSome();
  });

  it("等しい値で通過する", () => {
    expect(O.some({ a: 1 })).toBeSome({ a: 1 });
  });

  it("異なる値で失敗する", () => {
    expect(() => expect(O.some(1)).toBeSome(2)).toThrow(
      "Expected Some to equal",
    );
  });

  it("undefinedとの比較を区別する", () => {
    expect(O.some(undefined)).toBeSome();
    expect(O.some(undefined)).toBeSome(undefined);
    expect(() => expect(O.some(1)).toBeSome(undefined)).toThrow(
      "Expected Some to equal",
    );
    expect(O.some(1)).not.toBeSome(undefined);
  });

  it("Noneで失敗する", () => {
    expect(() => expect(O.none).toBeSome()).toThrow(
      "Expected Some, but received None",
    );
  });

  it("Optionでない値で失敗する", () => {
    expect(() => expect(1).toBeSome()).toThrow(
      "Received value must be an fp-ts Option",
    );
    expect(() => expect(null).toBeSome()).toThrow(
      "Received value must be an fp-ts Option",
    );
  });

  it("notで反転する", () => {
    expect(O.none).not.toBeSome();
  });
});
