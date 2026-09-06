import * as E from "fp-ts/Either";
import { describe, expect, it } from "vite-plus/test";

import type { AttemptOutcome } from "./attempt.ts";
import { decide } from "./decide.ts";
import type { RetryPolicy } from "./policy.ts";

describe("decide", () => {
  const basePolicy: RetryPolicy = {
    url: "https://example.com/",
    maxRetries: 1,
    retryOn: [500],
    methodRetryable: true,
    bodyRetryable: true,
    timeoutMs: undefined,
  };

  it("ok応答はそのまま返す", () => {
    const response = new Response("ok");
    const outcome: AttemptOutcome = { type: "responded", response };
    expect(decide(outcome, basePolicy, 0)).toEqual({
      type: "return",
      result: E.right(response),
    });
  });

  it("404はnot_foundで応答を破棄する", () => {
    const response = new Response("no", { status: 404 });
    const outcome: AttemptOutcome = { type: "responded", response };
    expect(decide(outcome, basePolicy, 0)).toEqual({
      type: "return",
      result: E.left({ type: "not_found", url: "https://example.com/" }),
      discard: response,
    });
  });

  it("再試行可能な状態はretryし応答を破棄する", () => {
    const response = new Response("e", { status: 500 });
    const outcome: AttemptOutcome = { type: "responded", response };
    expect(decide(outcome, basePolicy, 0)).toEqual({
      type: "retry",
      discard: response,
    });
  });

  it("回数超過はfetch_errorで応答を破棄する", () => {
    const exhaustedResponse = new Response("e", {
      status: 500,
      statusText: "ISE",
    });
    const exhausted: AttemptOutcome = {
      type: "responded",
      response: exhaustedResponse,
    };
    expect(decide(exhausted, basePolicy, 1)).toEqual({
      type: "return",
      result: E.left({ type: "fetch_error", status: 500, error: "ISE" }),
      discard: exhaustedResponse,
    });
  });

  it("対象外状態はfetch_errorで応答を破棄する", () => {
    const offTargetResponse = new Response("bad", {
      status: 400,
      statusText: "Bad",
    });
    const offTarget: AttemptOutcome = {
      type: "responded",
      response: offTargetResponse,
    };
    expect(decide(offTarget, basePolicy, 0)).toEqual({
      type: "return",
      result: E.left({ type: "fetch_error", status: 400, error: "Bad" }),
      discard: offTargetResponse,
    });
  });

  it("非冪等メソッドはfetch_errorで応答を破棄する", () => {
    const nonIdempotentResponse = new Response("e", {
      status: 500,
      statusText: "ISE",
    });
    const nonIdempotent: AttemptOutcome = {
      type: "responded",
      response: nonIdempotentResponse,
    };
    expect(
      decide(nonIdempotent, { ...basePolicy, methodRetryable: false }, 0),
    ).toEqual({
      type: "return",
      result: E.left({ type: "fetch_error", status: 500, error: "ISE" }),
      discard: nonIdempotentResponse,
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
    expect(decide(outcome, basePolicy, 0)).toEqual({ type: "retry" });
    expect(decide(outcome, basePolicy, 1)).toEqual({
      type: "return",
      result: E.left({
        type: "network_error",
        url: "https://example.com/",
        message: "dns fail",
        cause,
      }),
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
    expect(decide(outcome, basePolicy, 0)).toEqual({ type: "retry" });
    expect(decide(outcome, { ...basePolicy, timeoutMs: 10 }, 1)).toEqual({
      type: "return",
      result: E.left({
        type: "timeout_error",
        url: "https://example.com/",
        timeoutMs: 10,
      }),
    });
  });

  it("timeoutMsなしの超過はtimeoutMs: 0のtimeout_error", () => {
    const outcome: AttemptOutcome = {
      type: "thrown",
      error: new DOMException("fetch timeout", "TimeoutError"),
      timedOut: true,
      aborted: true,
      abortReason: new DOMException("fetch timeout", "TimeoutError"),
    };
    expect(decide(outcome, basePolicy, 1)).toEqual({
      type: "return",
      result: E.left({
        type: "timeout_error",
        url: "https://example.com/",
        timeoutMs: 0,
      }),
    });
  });

  it("Errorインスタンスでない原因はString化してnetwork_error", () => {
    const outcome: AttemptOutcome = {
      type: "thrown",
      error: "boom",
      timedOut: false,
      aborted: false,
      abortReason: undefined,
    };
    expect(decide(outcome, basePolicy, 1)).toEqual({
      type: "return",
      result: E.left({
        type: "network_error",
        url: "https://example.com/",
        message: "boom",
        cause: "boom",
      }),
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
    expect(decide(aborted, basePolicy, 0)).toEqual({
      type: "return",
      result: E.left({
        type: "abort_error",
        url: "https://example.com/",
        reason,
      }),
    });
    const preAborted: AttemptOutcome = { type: "preAborted", reason };
    expect(decide(preAborted, basePolicy, 0)).toEqual({
      type: "return",
      result: E.left({
        type: "abort_error",
        url: "https://example.com/",
        reason,
      }),
    });
  });

  it("非再送ボディはステータス失敗でもリトライしない", () => {
    const response = new Response("e", { status: 500, statusText: "ISE" });
    const outcome: AttemptOutcome = { type: "responded", response };
    expect(decide(outcome, { ...basePolicy, bodyRetryable: false }, 0)).toEqual(
      {
        type: "return",
        result: E.left({ type: "fetch_error", status: 500, error: "ISE" }),
        discard: response,
      },
    );
  });

  it("非再送ボディはネットワーク失敗でもリトライしない", () => {
    const cause = new TypeError("fetch failed");
    const outcome: AttemptOutcome = {
      type: "thrown",
      error: cause,
      timedOut: false,
      aborted: false,
      abortReason: undefined,
    };
    expect(decide(outcome, { ...basePolicy, bodyRetryable: false }, 0)).toEqual(
      {
        type: "return",
        result: E.left({
          type: "network_error",
          url: "https://example.com/",
          message: "fetch failed",
          cause,
        }),
      },
    );
  });
});
