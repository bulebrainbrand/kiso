import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { attemptOnce, discardBody } from "./attempt.ts";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const okResponse = () => new Response("ok", { status: 200 });

describe("attemptOnce", () => {
  it("事前に abort 済みなら fetch を呼ばず preAborted を返す", async () => {
    const mock = vi.fn(async () => okResponse());
    vi.stubGlobal("fetch", mock);
    const reason = new Error("already aborted");
    const controller = new AbortController();
    controller.abort(reason);
    const outcome = await attemptOnce(
      "https://example.com/",
      undefined,
      controller.signal,
      undefined,
    );
    expect(mock).not.toHaveBeenCalled();
    expect(outcome).toEqual({ type: "preAborted", reason });
  });

  it("成功時は responded を同一参照で返す", async () => {
    const response = okResponse();
    const mock = vi.fn(async () => response);
    vi.stubGlobal("fetch", mock);
    const outcome = await attemptOnce(
      "https://example.com/",
      undefined,
      undefined,
      undefined,
    );
    expect(outcome).toEqual({ type: "responded", response });
  });

  it("通常の throw は timedOut/aborted ともに false", async () => {
    const cause = new TypeError("fetch failed");
    const mock = vi.fn(async () => {
      throw cause;
    });
    vi.stubGlobal("fetch", mock);
    const outcome = await attemptOnce(
      "https://example.com/",
      undefined,
      undefined,
      undefined,
    );
    expect(outcome.type).toBe("thrown");
    if (outcome.type === "thrown") {
      expect(outcome.error).toBe(cause);
      expect(outcome.timedOut).toBe(false);
      expect(outcome.aborted).toBe(false);
    } else {
      expect.unreachable();
    }
  });

  it("timeoutMs 超過は timedOut: true", async () => {
    const mock = vi.fn(
      (_input: unknown, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(init.signal?.reason);
          });
        }),
    );
    vi.stubGlobal("fetch", mock);
    const outcome = await attemptOnce(
      "https://example.com/slow",
      undefined,
      undefined,
      10,
    );
    expect(outcome.type).toBe("thrown");
    if (outcome.type === "thrown") {
      expect(outcome.timedOut).toBe(true);
    } else {
      expect.unreachable();
    }
  });

  it("実行中の user abort は aborted: true と reason を返す", async () => {
    const mock = vi.fn(
      (_input: unknown, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(init.signal?.reason);
          });
        }),
    );
    vi.stubGlobal("fetch", mock);
    const controller = new AbortController();
    const reason = new Error("cancel mid-flight");
    setTimeout(() => {
      controller.abort(reason);
    }, 10);
    const outcome = await attemptOnce(
      "https://example.com/",
      undefined,
      controller.signal,
      undefined,
    );
    expect(outcome).toEqual({
      type: "thrown",
      error: reason,
      timedOut: false,
      aborted: true,
      abortReason: reason,
    });
  });

  it("userSignal がなくても動作する", async () => {
    const response = okResponse();
    const mock = vi.fn(async () => response);
    vi.stubGlobal("fetch", mock);
    const outcome = await attemptOnce(
      "https://example.com/",
      undefined,
      null,
      undefined,
    );
    expect(outcome).toEqual({ type: "responded", response });
  });
});

describe("discardBody", () => {
  it("body をキャンセルする", async () => {
    let cancelled = false;
    const stream = new ReadableStream({
      cancel() {
        cancelled = true;
      },
    });
    await discardBody(new Response(stream, { status: 500 }));
    expect(cancelled).toBe(true);
  });

  it("undefined でも失敗しない", async () => {
    await discardBody(undefined);
  });

  it("キャンセル失敗を握りつぶす", async () => {
    const stream = new ReadableStream({
      cancel() {
        throw new Error("cancel failed");
      },
    });
    await discardBody(new Response(stream, { status: 500 }));
  });
});
