import { describe, expect, it } from "vite-plus/test";

import { mockProvider } from "../../../__tests__/mocks.ts";
import { resolveContestId } from "./resolveContestId.ts";

describe("resolveContestId", () => {
  it("非URL入力はそのままcontestIdとして返す", async () => {
    const result = await resolveContestId(mockProvider("yukicoder"), "100")();

    expect(result).toStrictEqualRight("100");
  });

  it("URL入力はproviderのparse結果を返す", async () => {
    const result = await resolveContestId(
      mockProvider("yukicoder", { parseId: "100" }),
      "https://yukicoder.me/contests/100",
    )();

    expect(result).toStrictEqualRight("100");
  });

  it("parseに失敗したらcontest_id_parse_errorを返す", async () => {
    const result = await resolveContestId(
      mockProvider("yukicoder", { parseId: null }),
      "https://yukicoder.me/problems/no/1",
    )();

    expect(result).toStrictEqualLeft({
      type: "contest_id_parse_error",
      input: "https://yukicoder.me/problems/no/1",
      provider: "yukicoder",
    });
  });
});
