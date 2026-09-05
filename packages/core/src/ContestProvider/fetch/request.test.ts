import { describe, expect, it } from "vite-plus/test";
import { resolveMethod, resolveUrl } from "./request.ts";

describe("resolveUrl", () => {
  it("string/URL/Request から URL 文字列を取り出す", () => {
    expect(resolveUrl("https://example.com/a")).toBe("https://example.com/a");
    expect(resolveUrl(new URL("https://example.com/b"))).toBe("https://example.com/b");
    expect(resolveUrl(new Request("https://example.com/c"))).toBe("https://example.com/c");
  });
});

describe("resolveMethod", () => {
  it("init.method が Request.method より優先され、未指定は GET", () => {
    expect(resolveMethod("https://example.com/")).toBe("GET");
    expect(resolveMethod("https://example.com/", { method: "post" })).toBe("POST");
    expect(
      resolveMethod(new Request("https://example.com/", { method: "POST" }), { method: "PUT" }),
    ).toBe("PUT");
    expect(resolveMethod(new Request("https://example.com/", { method: "PATCH" }))).toBe("PATCH");
  });
});
