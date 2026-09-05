import { describe, expect, it } from "vite-plus/test";
import { cloneInput, isBodyRetryable, resolveMethod, resolveUrl } from "./request.ts";

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

describe("cloneInput", () => {
  it("Request は複製を返し、元は未消費のまま残る", async () => {
    const request = new Request("https://example.com/", { method: "PUT", body: "hello" });
    const cloned = cloneInput(request);
    expect(cloned).not.toBe(request);
    expect(cloned).toBeInstanceOf(Request);
    expect(await (cloned as Request).text()).toBe("hello");
    expect(await request.text()).toBe("hello");
  });

  it("string/URL はそのまま返す", () => {
    expect(cloneInput("https://example.com/a")).toBe("https://example.com/a");
    const url = new URL("https://example.com/b");
    expect(cloneInput(url)).toBe(url);
  });
});

describe("isBodyRetryable", () => {
  it("ボディなし・再送可能ボディは true", () => {
    expect(isBodyRetryable(undefined)).toBe(true);
    expect(isBodyRetryable({})).toBe(true);
    expect(isBodyRetryable({ method: "PUT", body: "hello" })).toBe(true);
  });

  it("ストリームボディは false", () => {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode("x"));
        controller.close();
      },
    });
    expect(isBodyRetryable({ method: "PUT", body: stream })).toBe(false);
  });
});
