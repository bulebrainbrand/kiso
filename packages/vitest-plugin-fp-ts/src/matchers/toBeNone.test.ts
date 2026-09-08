import * as O from "fp-ts/Option";
import { describe, expect, it } from "vite-plus/test";

import "../vite-plus.ts";

describe("toBeNone", () => {
  it("Noneを通過する", () => {
    expect(O.none).toBeNone();
  });

  it("Someで失敗する", () => {
    expect(() => expect(O.some(1)).toBeNone()).toThrow();
    expect(() => expect(O.some(undefined)).toBeNone()).toThrow();
  });

  it("Optionでない値で失敗する", () => {
    expect(() => expect(1).toBeNone()).toThrow();
    expect(() => expect(null).toBeNone()).toThrow();
    expect(() => expect(undefined).toBeNone()).toThrow();
  });

  it("notで反転する", () => {
    expect(O.some(1)).not.toBeNone();
  });
});
