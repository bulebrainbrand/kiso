import { describe, expect, it } from "vite-plus/test";

import { mockConfig, mockProvider } from "../../../__tests__/mocks.ts";
import { resolveProviders } from "./resolveProviders.ts";

describe("resolveProviders", () => {
  it("provider名指定で一致するproviderを返す", async () => {
    const yukicoder = mockProvider("yukicoder");
    const atcoder = mockProvider("atcoder");

    const result = await resolveProviders(
      mockConfig([yukicoder, atcoder]),
      "100",
      "atcoder",
      "/workspace",
    )();

    expect(result).toStrictEqualRight([atcoder]);
  });

  it("存在しないprovider名ならprovider_not_foundを返す", async () => {
    const result = await resolveProviders(
      mockConfig([mockProvider("yukicoder")]),
      "100",
      "unknown",
      "/workspace",
    )();

    expect(result).toStrictEqualLeft({
      type: "provider_not_found",
      name: "unknown",
    });
  });

  it("ID入力でマッチするproviderを推論する", async () => {
    const yukicoder = mockProvider("yukicoder", { isTargetId: true });
    const atcoder = mockProvider("atcoder", { isTargetId: false });

    const result = await resolveProviders(
      mockConfig([yukicoder, atcoder]),
      "100",
      undefined,
      "/workspace",
    )();

    expect(result).toStrictEqualRight([yukicoder]);
  });

  it("URL入力でマッチするproviderを推論する", async () => {
    const yukicoder = mockProvider("yukicoder", { isTargetUrl: true });
    const atcoder = mockProvider("atcoder", { isTargetUrl: false });

    const result = await resolveProviders(
      mockConfig([yukicoder, atcoder]),
      "https://yukicoder.me/contests/100",
      undefined,
      "/workspace",
    )();

    expect(result).toStrictEqualRight([yukicoder]);
  });

  it("推論でヒットしなければprovider_not_hitを返す", async () => {
    const result = await resolveProviders(
      mockConfig([mockProvider("yukicoder")]),
      "abc100",
      undefined,
      "/workspace",
    )();

    expect(result).toStrictEqualLeft({ type: "provider_not_hit" });
  });

  it("判定に失敗したproviderを除外して残りを返す", async () => {
    const broken = mockProvider("broken", { isTargetId: "error" });
    const yukicoder = mockProvider("yukicoder", { isTargetId: true });

    const result = await resolveProviders(
      mockConfig([broken, yukicoder]),
      "100",
      undefined,
      "/workspace",
    )();

    expect(result).toStrictEqualRight([yukicoder]);
  });
});
