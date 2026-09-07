import { describe, expect, it } from "vite-plus/test";

import { isURL } from "./isUrl.ts";

describe("isURL", () => {
  it("httpsのURLならtrueを返す", () => {
    expect(isURL("https://atcoder.jp/contests/abc474")).toBe(true);
    expect(isURL("https://yukicoder.me/contests/100")).toBe(true);
    expect(isURL("https://yukicoder.me")).toBe(true);
  });

  it("httpのURLならtrueを返す", () => {
    expect(isURL("http://example.com")).toBe(true);
    expect(isURL("http://yukicoder.me/problems/no/1")).toBe(true);
  });

  it("パス・クエリ・フラグメント付きURLならtrueを返す", () => {
    expect(isURL("https://example.com/path?q=1#frag")).toBe(true);
  });

  it("コンテストIDのような文字列ならfalseを返す", () => {
    expect(isURL("abc100")).toBe(false);
    expect(isURL("123")).toBe(false);
  });

  it("スキームなしの文字列ならfalseを返す", () => {
    expect(isURL("example.com")).toBe(false);
    expect(isURL("atcoder.jp/contests/abc474")).toBe(false);
  });

  it("http/https以外のスキームならfalseを返す", () => {
    expect(isURL("ftp://example.com")).toBe(false);
  });

  it("空文字やURLとして不正な文字列ならfalseを返す", () => {
    expect(isURL("")).toBe(false);
    expect(isURL("not a url")).toBe(false);
    expect(isURL("https://")).toBe(false);
  });
});
