import type { ContestProvider } from "@kiso/types";
import * as v from "valibot";
import { describe, expect, it } from "vite-plus/test";

import { ConfigSchema } from "./configSchema.ts";

const validLang = {
  plugins: [{ name: "typescript" }],
  default: ["typescript"],
};

describe("ConfigSchema provider", () => {
  it("providerありのconfigを読み込める", () => {
    const result = v.safeParse(ConfigSchema, {
      provider: [{ name: "yukicoder" }],
      lang: validLang,
    });
    expect(result.success).toBe(true);
  });

  it("余剰キーがあるprovider実インスタンスでも読み込める", () => {
    const result = v.safeParse(ConfigSchema, {
      provider: [{ name: "yukicoder", fetchContest: () => {} }],
      lang: validLang,
    });
    expect(result.success).toBe(true);
  });

  it("providerが空配列でも読み込める", () => {
    const result = v.safeParse(ConfigSchema, {
      provider: [],
      lang: validLang,
    });
    expect(result.success).toBe(true);
  });

  it("providerがない場合は失敗する", () => {
    const result = v.safeParse(ConfigSchema, { lang: validLang });
    expect(result.success).toBe(false);
  });

  it("nameがないproviderがある場合は失敗する", () => {
    const result = v.safeParse(ConfigSchema, {
      provider: [{}],
      lang: validLang,
    });
    expect(result.success).toBe(false);
  });

  it("パース後もprovider実インスタンスの参照とメソッドが保持される", () => {
    const provider = { name: "yukicoder", fetchContest: () => {} };
    const result = v.safeParse(ConfigSchema, {
      provider: [provider],
      lang: validLang,
    });
    if (!result.success) throw new Error("parse failed");
    expect(result.output.provider[0]).toBe(provider);
  });

  it("パース結果のproviderはContestProvider型として扱える", () => {
    const result = v.safeParse(ConfigSchema, {
      provider: [],
      lang: validLang,
    });
    if (!result.success) throw new Error("parse failed");
    const providers: ContestProvider[] = result.output.provider;
    expect(providers).toStrictEqual([]);
  });
});
