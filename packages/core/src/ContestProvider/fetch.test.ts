import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import {
  computeDelay,
  decide,
  isRetryableStatus,
  kisoFetch,
  resolveMethod,
  resolveUrl,
  type AttemptOutcome,
  type Decision,
  type RetryPolicy,
} from "./fetch.ts";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const okResponse = () => new Response("ok", { status: 200 });

describe("resolveUrl", () => {
  it("string/URL/Request から URL 文字列を取り出す", () => {
    expect(resolveUrl("https://example.com/a")).toBe("https://example.com/a");
    expect(resolveUrl(new URL("https://example.com/b"))).toBe("https://example.com/b");
    expect(resolveUrl(new Request("https://example.com/c"))).toBe("https://example.com/c");
  });
});

describe("isRetryableStatus", () => {
  it("配列指定で判定する", () => {
    expect(isRetryableStatus(500, [500, 503])).toBe(true);
    expect(isRetryableStatus(400, [500, 503])).toBe(false);
  });

  it("関数指定で判定する", () => {
    expect(isRetryableStatus(500, () => true)).toBe(true);
    expect(isRetryableStatus(500, () => false)).toBe(false);
  });
});

describe("computeDelay", () => {
  it("fixed は常に initialDelayMs", () => {
    expect(computeDelay(0, 100, "fixed", undefined)).toBe(100);
    expect(computeDelay(3, 100, "fixed", undefined)).toBe(100);
  });

  it("exponential は 2^n 倍", () => {
    expect(computeDelay(0, 100, "exponential", undefined)).toBe(100);
    expect(computeDelay(1, 100, "exponential", undefined)).toBe(200);
    expect(computeDelay(2, 100, "exponential", undefined)).toBe(400);
  });

  it("maxDelayMs で頭打ちになる", () => {
    expect(computeDelay(5, 100, "exponential", 250)).toBe(250);
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

describe("decide", () => {
  const basePolicy: RetryPolicy = {
    url: "https://example.com/",
    maxRetries: 1,
    retryOn: [500],
    methodRetryable: true,
    timeoutMs: undefined,
  };

  const summarize = (decision: Decision) => ({
    type: decision.type,
    ok: decision.type === "return" ? decision.result.isOk() : undefined,
    error:
      decision.type === "return" && decision.result.isErr() ? decision.result.error : undefined,
    discarded: decision.discard !== undefined,
  });

  it("ok応答はそのまま返す", () => {
    const outcome: AttemptOutcome = { type: "responded", response: new Response("ok") };
    expect(summarize(decide(outcome, basePolicy, 0))).toEqual({
      type: "return",
      ok: true,
      error: undefined,
      discarded: false,
    });
  });

  it("404はnot_foundで応答を破棄する", () => {
    const outcome: AttemptOutcome = {
      type: "responded",
      response: new Response("no", { status: 404 }),
    };
    expect(summarize(decide(outcome, basePolicy, 0))).toEqual({
      type: "return",
      ok: false,
      error: { type: "not_found", url: "https://example.com/" },
      discarded: true,
    });
  });

  it("再試行可能な状態はretryし応答を破棄する", () => {
    const outcome: AttemptOutcome = {
      type: "responded",
      response: new Response("e", { status: 500 }),
    };
    expect(summarize(decide(outcome, basePolicy, 0))).toEqual({
      type: "retry",
      ok: undefined,
      error: undefined,
      discarded: true,
    });
  });

  it("回数超過・対象外状態・非冪等メソッドはfetch_errorで応答を破棄する", () => {
    const exhausted: AttemptOutcome = {
      type: "responded",
      response: new Response("e", { status: 500, statusText: "ISE" }),
    };
    expect(summarize(decide(exhausted, basePolicy, 1))).toEqual({
      type: "return",
      ok: false,
      error: { type: "fetch_error", status: 500, error: "ISE" },
      discarded: true,
    });
    const offTarget: AttemptOutcome = {
      type: "responded",
      response: new Response("bad", { status: 400, statusText: "Bad" }),
    };
    expect(summarize(decide(offTarget, basePolicy, 0))).toEqual({
      type: "return",
      ok: false,
      error: { type: "fetch_error", status: 400, error: "Bad" },
      discarded: true,
    });
    const nonIdempotent: AttemptOutcome = {
      type: "responded",
      response: new Response("e", { status: 500, statusText: "ISE" }),
    };
    expect(summarize(decide(nonIdempotent, { ...basePolicy, methodRetryable: false }, 0))).toEqual({
      type: "return",
      ok: false,
      error: { type: "fetch_error", status: 500, error: "ISE" },
      discarded: true,
    });
  });

  it("ネットワーク失敗は回数内ならretry、超過でnetwork_error", () => {
    const cause = new TypeError("dns fail");
    const outcome: AttemptOutcome = {
      type: "thrown",
      error: cause,
      timedOut: false,
      aborted: false,
      abortReason: undefined,
    };
    expect(summarize(decide(outcome, basePolicy, 0))).toEqual({
      type: "retry",
      ok: undefined,
      error: undefined,
      discarded: false,
    });
    expect(summarize(decide(outcome, basePolicy, 1))).toEqual({
      type: "return",
      ok: false,
      error: {
        type: "network_error",
        url: "https://example.com/",
        message: "dns fail",
        cause,
      },
      discarded: false,
    });
  });

  it("タイムアウトは回数内ならretry、超過でtimeout_error", () => {
    const outcome: AttemptOutcome = {
      type: "thrown",
      error: new DOMException("fetch timeout", "TimeoutError"),
      timedOut: true,
      aborted: true,
      abortReason: new DOMException("fetch timeout", "TimeoutError"),
    };
    expect(summarize(decide(outcome, basePolicy, 0)).type).toBe("retry");
    expect(summarize(decide(outcome, { ...basePolicy, timeoutMs: 10 }, 1))).toEqual({
      type: "return",
      ok: false,
      error: { type: "timeout_error", url: "https://example.com/", timeoutMs: 10 },
      discarded: false,
    });
  });

  it("abortは即abort_error", () => {
    const reason = new Error("user abort");
    const aborted: AttemptOutcome = {
      type: "thrown",
      error: reason,
      timedOut: false,
      aborted: true,
      abortReason: reason,
    };
    expect(summarize(decide(aborted, basePolicy, 0))).toEqual({
      type: "return",
      ok: false,
      error: { type: "abort_error", url: "https://example.com/", reason },
      discarded: false,
    });
    const preAborted: AttemptOutcome = { type: "preAborted", reason };
    expect(summarize(decide(preAborted, basePolicy, 0))).toEqual({
      type: "return",
      ok: false,
      error: { type: "abort_error", url: "https://example.com/", reason },
      discarded: false,
    });
  });
});

describe("kisoFetch", () => {
  it("成功時は Response を返す", async () => {
    const mock = vi.fn(async () => okResponse());
    vi.stubGlobal("fetch", mock);
    const result = await kisoFetch("https://example.com/");
    expect(result.isOk()).toBe(true);
  });

  it("404 は not_found でリトライしない", async () => {
    const mock = vi.fn(async () => new Response("no", { status: 404 }));
    vi.stubGlobal("fetch", mock);
    const result = await kisoFetch("https://example.com/missing", undefined, {
      maxRetries: 2,
      initialDelayMs: 0,
    });
    expect(mock).toHaveBeenCalledTimes(1);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toEqual({ type: "not_found", url: "https://example.com/missing" });
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
    });
    expect(mock).toHaveBeenCalledTimes(2);
    expect(result.isOk()).toBe(true);
  });

  it("回数超過で fetch_error になる", async () => {
    const mock = vi.fn(async () => new Response("e", { status: 500, statusText: "ISE" }));
    vi.stubGlobal("fetch", mock);
    const result = await kisoFetch("https://example.com/", undefined, {
      maxRetries: 1,
      initialDelayMs: 0,
    });
    expect(mock).toHaveBeenCalledTimes(2);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toEqual({ type: "fetch_error", status: 500, error: "ISE" });
    }
  });

  it("リトライ対象外の 4xx は即 fetch_error", async () => {
    const mock = vi.fn(async () => new Response("bad", { status: 400, statusText: "Bad" }));
    vi.stubGlobal("fetch", mock);
    const result = await kisoFetch("https://example.com/", undefined, {
      maxRetries: 2,
      initialDelayMs: 0,
    });
    expect(mock).toHaveBeenCalledTimes(1);
    if (result.isErr()) {
      expect(result.error).toEqual({ type: "fetch_error", status: 400, error: "Bad" });
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
    });
    expect(mock).toHaveBeenCalledTimes(2);
    expect(result.isOk()).toBe(true);
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
    });
    expect(mock).toHaveBeenCalledTimes(2);
    expect(result.isOk()).toBe(true);
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
    });
    expect(mock).toHaveBeenCalledTimes(2);
    if (result.isErr()) {
      expect(result.error).toEqual({
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
    });
    if (result.isErr()) {
      expect(result.error).toEqual({
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
    const result = await kisoFetch("https://example.com/", { signal: controller.signal });
    expect(mock).not.toHaveBeenCalled();
    if (result.isErr()) {
      expect(result.error.type).toBe("abort_error");
    } else {
      expect.unreachable();
    }
  });

  it("maxRetries: Infinity は有限limitに倒して無限ループしない", async () => {
    const mock = vi.fn(async () => new Response("e", { status: 500, statusText: "ISE" }));
    vi.stubGlobal("fetch", mock);
    const result = await kisoFetch("https://example.com/", undefined, {
      maxRetries: Infinity,
      initialDelayMs: 0,
    });
    expect(mock).toHaveBeenCalledTimes(1);
    if (result.isErr()) {
      expect(result.error).toEqual({ type: "fetch_error", status: 500, error: "ISE" });
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
    );
    const elapsedMs = Date.now() - startedAt;
    expect(mock).toHaveBeenCalledTimes(1);
    expect(elapsedMs).toBeLessThan(1000);
    if (result.isErr()) {
      expect(result.error).toEqual({ type: "abort_error", url: "https://example.com/", reason });
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
    const result = await kisoFetch(request);
    expect(mock).toHaveBeenCalledTimes(1);
    if (result.isErr()) {
      expect(result.error).toEqual({
        type: "abort_error",
        url: "https://example.com/request-signal",
        reason,
      });
    } else {
      expect.unreachable();
    }
  });

  it("POST はステータス失敗でもリトライしない", async () => {
    const mock = vi.fn(async () => new Response("e", { status: 500, statusText: "ISE" }));
    vi.stubGlobal("fetch", mock);
    const result = await kisoFetch(
      "https://example.com/",
      { method: "POST" },
      { maxRetries: 2, initialDelayMs: 0 },
    );
    expect(mock).toHaveBeenCalledTimes(1);
    if (result.isErr()) {
      expect(result.error).toEqual({ type: "fetch_error", status: 500, error: "ISE" });
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
    );
    expect(mock).toHaveBeenCalledTimes(1);
    if (result.isErr()) {
      expect(result.error.type).toBe("network_error");
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
    );
    expect(mock).toHaveBeenCalledTimes(2);
    expect(result.isOk()).toBe(true);
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
    });
    expect(result.isOk()).toBe(true);
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
    });
    expect(mock).toHaveBeenCalledTimes(2);
    expect(result.isOk()).toBe(true);
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
    const result = await kisoFetch("https://example.com/gone");
    expect(result.isErr()).toBe(true);
    expect(cancelled).toBe(true);
  });
});
