import { describe, expect, it } from "vite-plus/test";

import { mockProvider } from "../../../__tests__/mocks.ts";
import { ensureSingleProvider } from "./ensureSingleProvider.ts";

describe("ensureSingleProvider", () => {
  it("1件ならそのproviderを返す", async () => {
    const yukicoder = mockProvider("yukicoder");

    const result = await ensureSingleProvider([yukicoder])();

    expect(result).toStrictEqualRight(yukicoder);
  });

  it("複数件ならprovider_ambiguousを返す", async () => {
    const result = await ensureSingleProvider([
      mockProvider("a"),
      mockProvider("b"),
    ])();

    expect(result).toStrictEqualLeft({
      type: "provider_ambiguous",
      names: ["a", "b"],
    });
  });

  it("空配列ならprovider_ambiguousを返す", async () => {
    const result = await ensureSingleProvider([])();

    expect(result).toStrictEqualLeft({
      type: "provider_ambiguous",
      names: [],
    });
  });
});
