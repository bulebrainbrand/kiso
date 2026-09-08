import type { ContestProvider, ProviderError } from "@kiso/types";
import * as O from "fp-ts/Option";
import * as TE from "fp-ts/TaskEither";
import { describe, expect, it } from "vite-plus/test";

import { findProvidersById, findProvidersByURL } from "./findProvider.ts";

const toTaskEither = (
  value: boolean | "error",
): TE.TaskEither<ProviderError, boolean> =>
  value === "error"
    ? TE.left({ type: "auth_error", reason: "invalid_credentials" })
    : TE.right(value);

const mockProvider = (
  name: string,
  isTarget: { url: boolean | "error"; id: boolean | "error" },
): ContestProvider => ({
  name,
  fetchContest: () =>
    TE.left({ type: "auth_error", reason: "invalid_credentials" }),
  loginSchema: {} as ContestProvider["loginSchema"],
  login: () => TE.right(undefined),
  whoami: () => TE.right(name),
  isTargetUrl: () => toTaskEither(isTarget.url),
  isTargetId: () => toTaskEither(isTarget.id),
  getContestDirectory: () => TE.right(`./${name}`),
});

describe("findProvidersByURL", () => {
  it("URLにマッチするproviderだけを返す", async () => {
    const yukicoder = mockProvider("yukicoder", { url: true, id: true });
    const atcoder = mockProvider("atcoder", { url: false, id: false });

    const result = await findProvidersByURL("https://yukicoder.me", [
      yukicoder,
      atcoder,
    ])();

    expect(result).toStrictEqual(O.some([yukicoder]));
  });

  it("マッチするproviderがなければnoneを返す", async () => {
    const providers = [
      mockProvider("yukicoder", { url: false, id: false }),
      mockProvider("atcoder", { url: false, id: false }),
    ];

    const result = await findProvidersByURL("https://example.com", providers)();

    expect(result).toStrictEqual(O.none);
  });

  it("判定に失敗したproviderは対象外として残りを返す", async () => {
    const broken = mockProvider("broken", { url: "error", id: "error" });
    const yukicoder = mockProvider("yukicoder", { url: true, id: true });

    const result = await findProvidersByURL("https://yukicoder.me", [
      broken,
      yukicoder,
    ])();

    expect(result).toStrictEqual(O.some([yukicoder]));
  });

  it("全ての判定が失敗したらnoneを返す", async () => {
    const providers = [
      mockProvider("a", { url: "error", id: "error" }),
      mockProvider("b", { url: "error", id: "error" }),
    ];

    const result = await findProvidersByURL(
      "https://yukicoder.me",
      providers,
    )();

    expect(result).toStrictEqual(O.none);
  });

  it("providersが空ならnoneを返す", async () => {
    const result = await findProvidersByURL("https://yukicoder.me", [])();

    expect(result).toStrictEqual(O.none);
  });
});

describe("findProvidersById", () => {
  it("IDにマッチするproviderだけを返す", async () => {
    const yukicoder = mockProvider("yukicoder", { url: false, id: true });
    const atcoder = mockProvider("atcoder", { url: true, id: false });

    const result = await findProvidersById("123", [yukicoder, atcoder])();

    expect(result).toStrictEqual(O.some([yukicoder]));
  });

  it("マッチするproviderがなければnoneを返す", async () => {
    const providers = [
      mockProvider("yukicoder", { url: true, id: false }),
      mockProvider("atcoder", { url: true, id: false }),
    ];

    const result = await findProvidersById("abc100", providers)();

    expect(result).toStrictEqual(O.none);
  });

  it("判定に失敗したproviderは対象外として残りを返す", async () => {
    const broken = mockProvider("broken", { url: "error", id: "error" });
    const yukicoder = mockProvider("yukicoder", { url: true, id: true });

    const result = await findProvidersById("123", [broken, yukicoder])();

    expect(result).toStrictEqual(O.some([yukicoder]));
  });

  it("providersが空ならnoneを返す", async () => {
    const result = await findProvidersById("123", [])();

    expect(result).toStrictEqual(O.none);
  });
});
