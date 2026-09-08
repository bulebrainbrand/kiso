import { cons } from "fp-ts/lib/ReadonlyNonEmptyArray.js";
import * as TE from "fp-ts/TaskEither";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

import { mockConfig, mockProvider } from "../../../__tests__/mocks.ts";
import { readConfig } from "../../config/index.ts";
import { executeNewCommand } from "./entry.ts";

vi.mock("../../config/index.ts", () => ({
  readConfig: vi.fn(),
}));

const mockReadConfig = vi.mocked(readConfig);

beforeEach(() => {
  vi.resetAllMocks();
});

describe("executeNewCommand", () => {
  it("provider指定+ID入力でcontestを取得して返す", async () => {
    const yukicoder = mockProvider("yukicoder", {
      contest: { id: "100", probrems: [] },
    });
    mockReadConfig.mockReturnValue(TE.right(mockConfig([yukicoder])));

    const result = await executeNewCommand(
      { id: "100", provider: "yukicoder" },
      "/workspace",
    )();

    expect(result).toBeRightWith(
      (value) =>
        value.provider === yukicoder
        && value.contestId === "100"
        && JSON.stringify(value.contest)
          === JSON.stringify({ id: "100", probrems: [] }),
    );
  });

  it("URL入力をparseして抽出したcontestIdで取得する", async () => {
    const yukicoder = mockProvider("yukicoder", {
      isTargetUrl: true,
      parseId: "100",
      contest: { id: "100", probrems: [] },
    });
    mockReadConfig.mockReturnValue(TE.right(mockConfig([yukicoder])));

    const result = await executeNewCommand(
      { id: "https://yukicoder.me/contests/100" },
      "/workspace",
    )();

    expect(result).toBeRightWith(
      (value) =>
        value.contestId === "100"
        && JSON.stringify(value.contest)
          === JSON.stringify({ id: "100", probrems: [] }),
    );
  });

  it("明示provider+URL入力でもURL解析を優先する", async () => {
    const yukicoder = mockProvider("yukicoder", {
      parseId: "100",
      contest: { id: "100", probrems: [] },
    });
    mockReadConfig.mockReturnValue(TE.right(mockConfig([yukicoder])));

    const result = await executeNewCommand(
      { id: "https://yukicoder.me/contests/100", provider: "yukicoder" },
      "/workspace",
    )();
    console.dir(result, { depth: 100 });
    expect(result).toBeRightWith((value) => value.contestId === "100");
  });

  it("URLのparseに失敗したらcontest_id_parse_errorを返す", async () => {
    const yukicoder = mockProvider("yukicoder", {
      isTargetUrl: true,
      parseId: null,
    });
    mockReadConfig.mockReturnValue(TE.right(mockConfig([yukicoder])));

    const result = await executeNewCommand(
      { id: "https://yukicoder.me/problems/no/1" },
      "/workspace",
    )();

    expect(result).toStrictEqualLeft({
      type: "contest_id_parse_error",
      input: "https://yukicoder.me/problems/no/1",
      provider: "yukicoder",
    });
  });

  it("複数providerがヒットしたらprovider_ambiguousを返す", async () => {
    const a = mockProvider("a", { isTargetId: true });
    const b = mockProvider("b", { isTargetId: true });
    mockReadConfig.mockReturnValue(TE.right(mockConfig([a, b])));

    const result = await executeNewCommand({ id: "100" }, "/workspace")();

    expect(result).toStrictEqualLeft({
      type: "provider_ambiguous",
      names: ["a", "b"],
    });
  });

  it("fetchContestの失敗はそのまま返す", async () => {
    const yukicoder = mockProvider("yukicoder", { contest: "fetch_error" });
    mockReadConfig.mockReturnValue(TE.right(mockConfig([yukicoder])));

    const result = await executeNewCommand(
      { id: "100", provider: "yukicoder" },
      "/workspace",
    )();

    expect(result).toStrictEqualLeft({ type: "not_found", url: "100" });
  });

  it("存在しないprovider名ならprovider_not_foundを返す", async () => {
    mockReadConfig.mockReturnValue(
      TE.right(mockConfig([mockProvider("yukicoder")])),
    );

    const result = await executeNewCommand(
      { id: "100", provider: "atcoder" },
      "/workspace",
    )();

    expect(result).toStrictEqualLeft({
      type: "provider_not_found",
      name: "atcoder",
    });
  });

  it("ヒットするproviderがなければprovider_not_hitを返す", async () => {
    mockReadConfig.mockReturnValue(
      TE.right(mockConfig([mockProvider("yukicoder")])),
    );

    const result = await executeNewCommand({ id: "100" }, "/workspace")();

    expect(result).toStrictEqualLeft({ type: "provider_not_hit" });
  });
});
