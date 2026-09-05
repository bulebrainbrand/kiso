import { describe, expect, it } from "vite-plus/test";

import {
  cloneInput,
  isBodyRetryable,
  isMethodRetryable,
  resolveMethod,
  resolveUrl,
  resolveUserSignal,
} from "./request.ts";

describe("resolveUrl", () => {
  it("string/URL/Request から URL 文字列を取り出す", () => {
    expect(resolveUrl("https://example.com/a")).toBe("https://example.com/a");
    expect(resolveUrl(new URL("https://example.com/b"))).toBe(
      "https://example.com/b",
    );
    expect(resolveUrl(new Request("https://example.com/c"))).toBe(
      "https://example.com/c",
    );
  });
});

describe("resolveMethod", () => {
  it("init.method が Request.method より優先され、未指定は GET", () => {
    expect(resolveMethod("https://example.com/")).toBe("GET");
    expect(resolveMethod("https://example.com/", { method: "post" })).toBe(
      "POST",
    );
    expect(
      resolveMethod(new Request("https://example.com/", { method: "POST" }), {
        method: "PUT",
      }),
    ).toBe("PUT");
    expect(
      resolveMethod(new Request("https://example.com/", { method: "PATCH" })),
    ).toBe("PATCH");
  });
});

describe("isMethodRetryable", () => {
  it("冪等メソッドは true", () => {
    for (const method of [
      "GET",
      "HEAD",
      "OPTIONS",
      "TRACE",
      "PUT",
      "DELETE",
      "QUERY",
    ]) {
      expect(isMethodRetryable("https://example.com/", { method })).toBe(true);
    }
  });

  it("小文字メソッドも大文字化して判定する", () => {
    expect(isMethodRetryable("https://example.com/", { method: "get" })).toBe(
      true,
    );
    expect(isMethodRetryable("https://example.com/", { method: "post" })).toBe(
      false,
    );
  });

  it("非冪等メソッドは false", () => {
    for (const method of ["POST", "PATCH", "CONNECT"]) {
      expect(isMethodRetryable("https://example.com/", { method })).toBe(false);
    }
  });

  it("未指定は GET として true", () => {
    expect(isMethodRetryable("https://example.com/")).toBe(true);
    expect(isMethodRetryable(new URL("https://example.com/"))).toBe(true);
    expect(isMethodRetryable(new Request("https://example.com/"))).toBe(true);
  });

  it("URL 入力でも判定できる", () => {
    expect(
      isMethodRetryable(new URL("https://example.com/"), { method: "PUT" }),
    ).toBe(true);
    expect(
      isMethodRetryable(new URL("https://example.com/"), { method: "POST" }),
    ).toBe(false);
  });

  it("Request のメソッドで判定できる", () => {
    expect(
      isMethodRetryable(
        new Request("https://example.com/", { method: "DELETE" }),
      ),
    ).toBe(true);
    expect(
      isMethodRetryable(
        new Request("https://example.com/", { method: "POST" }),
      ),
    ).toBe(false);
  });

  it("init.method が Request.method より優先される", () => {
    expect(
      isMethodRetryable(
        new Request("https://example.com/", { method: "POST" }),
        {
          method: "PUT",
        },
      ),
    ).toBe(true);
    expect(
      isMethodRetryable(
        new Request("https://example.com/", { method: "GET" }),
        {
          method: "POST",
        },
      ),
    ).toBe(false);
  });
});

describe("resolveUserSignal", () => {
  it("string/URL で signal 未指定は undefined", () => {
    expect(resolveUserSignal("https://example.com/")).toBeUndefined();
    expect(resolveUserSignal("https://example.com/", {})).toBeUndefined();
    expect(resolveUserSignal(new URL("https://example.com/"))).toBeUndefined();
    expect(
      resolveUserSignal(new URL("https://example.com/"), {}),
    ).toBeUndefined();
  });

  it("init.signal をそのまま返す", () => {
    const controller = new AbortController();
    expect(
      resolveUserSignal("https://example.com/", {
        signal: controller.signal,
      }),
    ).toBe(controller.signal);
    expect(
      resolveUserSignal(new URL("https://example.com/"), {
        signal: controller.signal,
      }),
    ).toBe(controller.signal);
  });

  it("Request の signal を拾う", () => {
    const controller = new AbortController();
    const request = new Request("https://example.com/", {
      signal: controller.signal,
    });
    expect(resolveUserSignal(request)).toBe(request.signal);
    controller.abort("boom");
    expect(request.signal.aborted).toBe(true);
  });

  it("signal なし Request はデフォルト signal を返す", () => {
    const request = new Request("https://example.com/");
    expect(resolveUserSignal(request)).toBe(request.signal);
  });

  it("init.signal が Request.signal より優先される", () => {
    const requestController = new AbortController();
    const initController = new AbortController();
    const request = new Request("https://example.com/", {
      signal: requestController.signal,
    });
    expect(resolveUserSignal(request, { signal: initController.signal })).toBe(
      initController.signal,
    );
  });

  it("init.signal が null/undefined のときは Request.signal にフォールバックする", () => {
    const controller = new AbortController();
    const request = new Request("https://example.com/", {
      signal: controller.signal,
    });
    expect(resolveUserSignal(request, {})).toBe(request.signal);
    expect(resolveUserSignal(request, { signal: undefined })).toBe(
      request.signal,
    );
    expect(resolveUserSignal(request, { signal: null })).toBe(request.signal);
  });
});

describe("cloneInput", () => {
  it("Request は複製を返し、元は未消費のまま残る", async () => {
    const request = new Request("https://example.com/", {
      method: "PUT",
      body: "hello",
    });
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
