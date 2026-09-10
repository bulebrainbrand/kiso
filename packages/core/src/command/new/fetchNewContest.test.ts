import { describe, expect, it } from "vite-plus/test";

import { mockProvider } from "../../../__tests__/mocks.ts";
import { fetchNewContest } from "./fetchNewContest.ts";

describe("fetchNewContest", () => {
  it("contest取得してprovider・contest・contestIdを組み立てる", async () => {
    const yukicoder = mockProvider("yukicoder", {
      contest: { id: "100", probrems: [] },
    });

    const result = await fetchNewContest(yukicoder, "100", "/workspace")();

    expect(result).toBeRightWith((value) => {
      expect(value.provider).toBe(yukicoder);
      expect(value.contestId).toBe("100");
      expect(value.contest).toEqual({ id: "100", probrems: [] });
    });
  });

  it("fetchの失敗はそのまま返す", async () => {
    const result = await fetchNewContest(
      mockProvider("yukicoder", { contest: "fetch_error" }),
      "100",
      "/workspace",
    )();

    expect(result).toStrictEqualLeft({ type: "not_found", url: "100" });
  });
});
