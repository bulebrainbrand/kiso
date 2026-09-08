import * as O from "fp-ts/Option";
import { describe, expect, it } from "vite-plus/test";

import "../vite-plus.ts";

describe("toBeNone", () => {
  it("Noneを通過する", () => {
    expect(O.none).toBeNone();
  });

  it("Someで失敗する", () => {
    expect(() => expect(O.some(1)).toBeNone()).toThrow(
      "Expected None, but received Some",
    );
    expect(() => expect(O.some(undefined)).toBeNone()).toThrow(
      "Expected None, but received Some",
    );
  });

  it("Optionでない値で失敗する", () => {
    expect(() => expect(1).toBeNone()).toThrow(
      "Received value must be an fp-ts Option",
    );
    expect(() => expect(null).toBeNone()).toThrow(
      "Received value must be an fp-ts Option",
    );
    expect(() => expect(undefined).toBeNone()).toThrow(
      "Received value must be an fp-ts Option",
    );
    expect(() => expect({}).toBeNone()).toThrow(
      "Received value must be an fp-ts Option",
    );
  });

  it("notで反転する", () => {
    expect(O.some(1)).not.toBeNone();
    expect(() => expect(O.none).not.toBeNone()).toThrow(
      "Expected value not to be None",
    );
  });
});
