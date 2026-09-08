import * as v from "valibot";
import { describe, expect, it } from "vite-plus/test";

import { contestProviderSchema, isContestProvider } from "./schema.ts";

describe("isContestProvider", () => {
  it("{ name: string } の場合はtrueを返す", () => {
    expect(isContestProvider({ name: "yukicoder" })).toBe(true);
  });

  it("余剰キーがある実インスタンスの場合もtrueを返す", () => {
    expect(isContestProvider({ name: "yukicoder", extra: 1 })).toBe(true);
  });

  it("nameがない場合はfalseを返す", () => {
    expect(isContestProvider({})).toBe(false);
  });

  it("nameがstringでない場合はfalseを返す", () => {
    expect(isContestProvider({ name: 123 })).toBe(false);
  });

  it("nullの場合はfalseを返す", () => {
    expect(isContestProvider(null)).toBe(false);
  });

  it("safeParseの出力は入力参照を保持する", () => {
    const provider = { name: "yukicoder", fetchContest: () => {} };
    const result = v.safeParse(contestProviderSchema, provider);
    if (!result.success) throw new Error("parse failed");
    expect(result.output).toBe(provider);
  });
});
