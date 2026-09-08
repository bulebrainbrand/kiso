import { describe, expect, it } from "vite-plus/test";

import { mockProvider } from "../../../__tests__/mocks.ts";
import { fetchNewContest } from "./fetchNewContest.ts";

describe("fetchNewContest", () => {
  it("contest取得してprovider・contest・contestIdを組み立てる", async () => {
    const yukicoder = mockProvider("yukicoder", {
      contest: { id: "100", probrems: [] },
    });

    const result = await fetchNewContest(yukicoder, "100")();

    expect(result).toBeRightWith(
      (value) =>
        value.provider === yukicoder
        && value.contestId === "100"
        && JSON.stringify(value.contest)
          === JSON.stringify({ id: "100", probrems: [] }),
    );
  });

  it("fetchの失敗はそのまま返す", async () => {
    const result = await fetchNewContest(
      mockProvider("yukicoder", { contest: "fetch_error" }),
      "100",
    )();

    expect(result).toStrictEqualLeft({ type: "not_found", url: "100" });
  });
});
