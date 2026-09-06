import * as E from "fp-ts/Either";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { kisoFetch } from "./index.ts";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const okResponse = () => new Response("ok", { status: 200 });

describe("kisoFetch", () => {
  it("成功時は Response を返す", async () => {
    const mock = vi.fn(async () => okResponse());
    vi.stubGlobal("fetch", mock);
    const result = await kisoFetch("https://example.com/")();
    expect(E.isRight(result)).toBe(true);
  });

  it("404 は not_found でリトライしない", async () => {
    const mock = vi.fn(async () => new Response("no", { status: 404 }));
    vi.stubGlobal("fetch", mock);
    const result = await kisoFetch("https://example.com/missing", undefined, {
      maxRetries: 2,
      initialDelayMs: 0,
    })();
    expect(mock).toHaveBeenCalledTimes(1);
    expect(E.isLeft(result)).toBe(true);
    if (E.isLeft(result)) {
      expect(result.left).toEqual({
        type: "not_found",
        url: "https://example.com/missing",
      });
    }
  });

  it("500 はリトライして成功できる", async () => {
    const mock = vi
      .fn()
      .mockResolvedValueOnce(new Response("e", { status: 500 }))
      .mockResolvedValueOnce(okResponse());
    vi.stubGlobal("fetch", mock);
    const result = await kisoFetch("https://example.com/", undefined, {
      maxRetries: 1,
      initialDelayMs: 0,
    })();
    expect(mock).toHaveBeenCalledTimes(2);
    expect(E.isRight(result)).toBe(true);
  });

  it("回数超過で fetch_error になる", async () => {
    const mock = vi.fn(
      async () => new Response("e", { status: 500, statusText: "ISE" }),
    );
    vi.stubGlobal("fetch", mock);
    const result = await kisoFetch("https://example.com/", undefined, {
      maxRetries: 1,
      initialDelayMs: 0,
    })();
    expect(mock).toHaveBeenCalledTimes(2);
    expect(E.isLeft(result)).toBe(true);
    if (E.isLeft(result)) {
      expect(result.left).toEqual({
        type: "fetch_error",
        status: 500,
        error: "ISE",
      });
    }
  });

  it("リトライ対象外の 4xx は即 fetch_error", async () => {
    const mock = vi.fn(
      async () => new Response("bad", { status: 400, statusText: "Bad" }),
    );
    vi.stubGlobal("fetch", mock);
    const result = await kisoFetch("https://example.com/", undefined, {
      maxRetries: 2,
      initialDelayMs: 0,
    })();
    expect(mock).toHaveBeenCalledTimes(1);
    if (E.isLeft(result)) {
      expect(result.left).toEqual({
        type: "fetch_error",
        status: 400,
        error: "Bad",
      });
    } else {
      expect.unreachable();
    }
  });

  it("retryOn カスタムで 400 をリトライできる", async () => {
    const mock = vi
      .fn()
      .mockResolvedValueOnce(new Response("bad", { status: 400 }))
      .mockResolvedValueOnce(okResponse());
    vi.stubGlobal("fetch", mock);
    const result = await kisoFetch("https://example.com/", undefined, {
      maxRetries: 1,
      initialDelayMs: 0,
      retryOn: [400],
    })();
    expect(mock).toHaveBeenCalledTimes(2);
    expect(E.isRight(result)).toBe(true);
  });

  it("throw は network_error になりリトライする", async () => {
    const mock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("fetch failed"))
      .mockResolvedValueOnce(okResponse());
    vi.stubGlobal("fetch", mock);
    const result = await kisoFetch("https://example.com/", undefined, {
      maxRetries: 1,
      initialDelayMs: 0,
    })();
    expect(mock).toHaveBeenCalledTimes(2);
    expect(E.isRight(result)).toBe(true);
  });

  it("throw が続くと network_error で確定する", async () => {
    const cause = new TypeError("dns fail");
    const mock = vi.fn(async () => {
      throw cause;
    });
    vi.stubGlobal("fetch", mock);
    const result = await kisoFetch("https://example.com/", undefined, {
      maxRetries: 1,
      initialDelayMs: 0,
    })();
    expect(mock).toHaveBeenCalledTimes(2);
    if (E.isLeft(result)) {
      expect(result.left).toEqual({
        type: "network_error",
        url: "https://example.com/",
        message: "dns fail",
        cause,
      });
    } else {
      expect.unreachable();
    }
  });

  it("timeoutMs 超過は timeout_error", async () => {
    const mock = vi.fn(
      (_input: unknown, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(init.signal?.reason);
          });
        }),
    );
    vi.stubGlobal("fetch", mock);
    const result = await kisoFetch("https://example.com/slow", undefined, {
      maxRetries: 0,
      timeoutMs: 10,
    })();
    if (E.isLeft(result)) {
      expect(result.left).toEqual({
        type: "timeout_error",
        url: "https://example.com/slow",
        timeoutMs: 10,
      });
    } else {
      expect.unreachable();
    }
  });

  it("事前に abort 済みなら abort_error で fetch を呼ばない", async () => {
    const mock = vi.fn(async () => okResponse());
    vi.stubGlobal("fetch", mock);
    const controller = new AbortController();
    controller.abort(new Error("user abort"));
    const result = await kisoFetch("https://example.com/", {
      signal: controller.signal,
    })();
    expect(mock).not.toHaveBeenCalled();
    if (E.isLeft(result)) {
      expect(result.left.type).toBe("abort_error");
    } else {
      expect.unreachable();
    }
  });

  it("maxRetries: Infinity は有限limitに倒して無限ループしない", async () => {
    const mock = vi.fn(
      async () => new Response("e", { status: 500, statusText: "ISE" }),
    );
    vi.stubGlobal("fetch", mock);
    const result = await kisoFetch("https://example.com/", undefined, {
      maxRetries: Infinity,
      initialDelayMs: 0,
    })();
    expect(mock).toHaveBeenCalledTimes(1);
    if (E.isLeft(result)) {
      expect(result.left).toEqual({
        type: "fetch_error",
        status: 500,
        error: "ISE",
      });
    } else {
      expect.unreachable();
    }
  });

  it("リトライ待機中に abort されると promptly に abort_error で終わる", async () => {
    const mock = vi
      .fn()
      .mockResolvedValueOnce(new Response("e", { status: 500 }))
      .mockResolvedValueOnce(okResponse());
    vi.stubGlobal("fetch", mock);
    const controller = new AbortController();
    const reason = new Error("cancel during backoff");
    setTimeout(() => {
      controller.abort(reason);
    }, 10);
    const startedAt = Date.now();
    const result = await kisoFetch(
      "https://example.com/",
      { signal: controller.signal },
      { maxRetries: 1, initialDelayMs: 1000, backoff: "fixed" },
    )();
    const elapsedMs = Date.now() - startedAt;
    expect(mock).toHaveBeenCalledTimes(1);
    expect(elapsedMs).toBeLessThan(1000);
    if (E.isLeft(result)) {
      expect(result.left).toEqual({
        type: "abort_error",
        url: "https://example.com/",
        reason,
      });
    } else {
      expect.unreachable();
    }
  });

  it("Request の signal を abort すると fetch がキャンセルされる", async () => {
    const mock = vi.fn(
      (_input: unknown, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          if (init?.signal?.aborted) {
            reject(init.signal.reason);
            return;
          }
          init?.signal?.addEventListener("abort", () => {
            reject(init.signal?.reason);
          });
        }),
    );
    vi.stubGlobal("fetch", mock);
    const controller = new AbortController();
    const reason = new Error("cancel request signal");
    const request = new Request("https://example.com/request-signal", {
      signal: controller.signal,
    });
    setTimeout(() => {
      controller.abort(reason);
    }, 10);
    const result = await kisoFetch(request)();
    expect(mock).toHaveBeenCalledTimes(1);
    if (E.isLeft(result)) {
      expect(result.left).toEqual({
        type: "abort_error",
        url: "https://example.com/request-signal",
        reason,
      });
    } else {
      expect.unreachable();
    }
  });

  it("POST はステータス失敗でもリトライしない", async () => {
    const mock = vi.fn(
      async () => new Response("e", { status: 500, statusText: "ISE" }),
    );
    vi.stubGlobal("fetch", mock);
    const result = await kisoFetch(
      "https://example.com/",
      { method: "POST" },
      { maxRetries: 2, initialDelayMs: 0 },
    )();
    expect(mock).toHaveBeenCalledTimes(1);
    if (E.isLeft(result)) {
      expect(result.left).toEqual({
        type: "fetch_error",
        status: 500,
        error: "ISE",
      });
    } else {
      expect.unreachable();
    }
  });

  it("POST はネットワーク失敗でもリトライしない", async () => {
    const cause = new TypeError("fetch failed");
    const mock = vi.fn(async () => {
      throw cause;
    });
    vi.stubGlobal("fetch", mock);
    const result = await kisoFetch(
      "https://example.com/",
      { method: "POST" },
      { maxRetries: 2, initialDelayMs: 0 },
    )();
    expect(mock).toHaveBeenCalledTimes(1);
    if (E.isLeft(result)) {
      expect(result.left.type).toBe("network_error");
    } else {
      expect.unreachable();
    }
  });

  it("PUT は冪等なのでリトライする", async () => {
    const mock = vi
      .fn()
      .mockResolvedValueOnce(new Response("e", { status: 500 }))
      .mockResolvedValueOnce(okResponse());
    vi.stubGlobal("fetch", mock);
    const result = await kisoFetch(
      "https://example.com/",
      { method: "PUT" },
      { maxRetries: 1, initialDelayMs: 0 },
    )();
    expect(mock).toHaveBeenCalledTimes(2);
    expect(E.isRight(result)).toBe(true);
  });

  it("リトライ時に捨てる応答の body をキャンセルする", async () => {
    let cancelled = false;
    const stream = new ReadableStream({
      cancel() {
        cancelled = true;
      },
    });
    const mock = vi
      .fn()
      .mockResolvedValueOnce(new Response(stream, { status: 500 }))
      .mockResolvedValueOnce(okResponse());
    vi.stubGlobal("fetch", mock);
    const result = await kisoFetch("https://example.com/", undefined, {
      maxRetries: 1,
      initialDelayMs: 0,
    })();
    expect(E.isRight(result)).toBe(true);
    expect(cancelled).toBe(true);
  });

  it("body のキャンセル失敗でもリトライは継続する", async () => {
    const stream = new ReadableStream({
      cancel() {
        throw new Error("cancel failed");
      },
    });
    const mock = vi
      .fn()
      .mockResolvedValueOnce(new Response(stream, { status: 500 }))
      .mockResolvedValueOnce(okResponse());
    vi.stubGlobal("fetch", mock);
    const result = await kisoFetch("https://example.com/", undefined, {
      maxRetries: 1,
      initialDelayMs: 0,
    })();
    expect(mock).toHaveBeenCalledTimes(2);
    expect(E.isRight(result)).toBe(true);
  });

  it("404 終端時も応答の body をキャンセルする", async () => {
    let cancelled = false;
    const stream = new ReadableStream({
      cancel() {
        cancelled = true;
      },
    });
    const mock = vi.fn(async () => new Response(stream, { status: 404 }));
    vi.stubGlobal("fetch", mock);
    const result = await kisoFetch("https://example.com/gone")();
    expect(E.isLeft(result)).toBe(true);
    expect(cancelled).toBe(true);
  });

  it("Request ボディは試行ごとに複製されリトライできる", async () => {
    const request = new Request("https://example.com/", {
      method: "PUT",
      body: "hello",
    });
    const seen: string[] = [];
    const mock = vi.fn(async (input: unknown) => {
      seen.push(await (input as Request).text());
      return seen.length === 1
        ? new Response("e", { status: 500 })
        : okResponse();
    });
    vi.stubGlobal("fetch", mock);
    const result = await kisoFetch(request, undefined, {
      maxRetries: 1,
      initialDelayMs: 0,
    })();
    expect(mock).toHaveBeenCalledTimes(2);
    expect(E.isRight(result)).toBe(true);
    expect(seen).toEqual(["hello", "hello"]);
  });

  it("ストリームボディはリトライしない", async () => {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode("x"));
        controller.close();
      },
    });
    const mock = vi.fn(
      async () => new Response("e", { status: 500, statusText: "ISE" }),
    );
    vi.stubGlobal("fetch", mock);
    const result = await kisoFetch(
      "https://example.com/",
      { method: "PUT", body: stream },
      { maxRetries: 2, initialDelayMs: 0 },
    )();
    expect(mock).toHaveBeenCalledTimes(1);
    if (E.isLeft(result)) {
      expect(result.left).toEqual({
        type: "fetch_error",
        status: 500,
        error: "ISE",
      });
    } else {
      expect.unreachable();
    }
  });
});
