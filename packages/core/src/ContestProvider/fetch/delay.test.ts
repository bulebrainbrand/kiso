import * as E from "fp-ts/Either";
import { describe, expect, it } from "vite-plus/test";

import {
  computeDelay,
  sleep,
  waitForRetry,
  type DelayConfig,
} from "./delay.ts";

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

  it("maxDelayMs なしでも指数オーバーフローは Node 上限に丸める", () => {
    expect(computeDelay(1024, 100, "exponential", undefined)).toBe(2 ** 31 - 1);
  });

  it("maxDelayMs 指定は維持される", () => {
    expect(computeDelay(1024, 100, "exponential", 250)).toBe(250);
  });

  it("Node 上限超えの maxDelayMs は Node 上限に丸める", () => {
    expect(
      computeDelay(1024, 100, "exponential", Number.MAX_SAFE_INTEGER),
    ).toBe(2 ** 31 - 1);
  });
});

describe("sleep", () => {
  it("指定時間後に解決する", async () => {
    const startedAt = Date.now();
    await sleep(30);
    expect(Date.now() - startedAt).toBeGreaterThanOrEqual(20);
  });

  it("0以下は即解決する", async () => {
    await sleep(0);
    await sleep(-1);
  });

  it("事前に abort 済みなら reason で reject する", async () => {
    const reason = new Error("already aborted");
    const controller = new AbortController();
    controller.abort(reason);
    await expect(sleep(1000, controller.signal)).rejects.toBe(reason);
  });

  it("待機中の abort でタイマーを破棄して reason で reject する", async () => {
    const reason = new Error("abort during sleep");
    const controller = new AbortController();
    setTimeout(() => {
      controller.abort(reason);
    }, 10);
    const startedAt = Date.now();
    await expect(sleep(5000, controller.signal)).rejects.toBe(reason);
    expect(Date.now() - startedAt).toBeLessThan(5000);
  });

  it("signal なしでは最後まで待つ", async () => {
    await sleep(10);
  });
});

describe("waitForRetry", () => {
  const config: DelayConfig = {
    initialDelayMs: 0,
    backoff: "fixed",
    maxDelayMs: undefined,
  };

  it("待機完了で Ok を返す", async () => {
    const result = await waitForRetry(
      0,
      config,
      "https://example.com/",
      undefined,
    )();
    expect(E.isRight(result)).toBe(true);
  });

  it("待機中の abort で abort_error の Err を返す", async () => {
    const reason = new Error("cancel backoff");
    const controller = new AbortController();
    setTimeout(() => {
      controller.abort(reason);
    }, 10);
    const waiting: DelayConfig = {
      initialDelayMs: 5000,
      backoff: "fixed",
      maxDelayMs: undefined,
    };
    const result = await waitForRetry(
      0,
      waiting,
      "https://example.com/",
      controller.signal,
    )();
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
});
