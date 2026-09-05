import { describe, expect, it } from "vite-plus/test";
import { defaultRetryOn, isRetryableStatus, normalizeOptions, toAbortError } from "./policy.ts";

describe("defaultRetryOn", () => {
  it("429 と 5xx をリトライ対象にする", () => {
    expect(defaultRetryOn(429)).toBe(true);
    expect(defaultRetryOn(500)).toBe(true);
    expect(defaultRetryOn(503)).toBe(true);
    expect(defaultRetryOn(599)).toBe(true);
  });

  it("それ以外は対象外にする", () => {
    expect(defaultRetryOn(400)).toBe(false);
    expect(defaultRetryOn(404)).toBe(false);
    expect(defaultRetryOn(600)).toBe(false);
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

describe("normalizeOptions", () => {
  it("未指定は全デフォルトになる", () => {
    const normalized = normalizeOptions(undefined);
    expect(normalized.maxRetries).toBe(0);
    expect(normalized.initialDelayMs).toBe(100);
    expect(normalized.backoff).toBe("exponential");
    expect(normalized.maxDelayMs).toBeUndefined();
    expect(normalized.retryOn).toBe(defaultRetryOn);
    expect(normalized.timeoutMs).toBeUndefined();
  });

  it("指定値はそのまま通る", () => {
    const retryOn = [500, 503];
    const normalized = normalizeOptions({
      maxRetries: 2,
      initialDelayMs: 50,
      backoff: "fixed",
      maxDelayMs: 1000,
      retryOn,
      timeoutMs: 3000,
    });
    expect(normalized).toEqual({
      maxRetries: 2,
      initialDelayMs: 50,
      backoff: "fixed",
      maxDelayMs: 1000,
      retryOn,
      timeoutMs: 3000,
    });
    expect(normalized.retryOn).toBe(retryOn);
  });

  it("maxRetries は floor し負数は 0 になる", () => {
    expect(normalizeOptions({ maxRetries: 2.7 }).maxRetries).toBe(2);
    expect(normalizeOptions({ maxRetries: -1 }).maxRetries).toBe(0);
  });

  it("maxRetries の非有限値はデフォルトになる", () => {
    expect(normalizeOptions({ maxRetries: Infinity }).maxRetries).toBe(0);
    expect(normalizeOptions({ maxRetries: NaN }).maxRetries).toBe(0);
  });

  it("initialDelayMs の負数は 0 になる", () => {
    expect(normalizeOptions({ initialDelayMs: -5 }).initialDelayMs).toBe(0);
  });
});

describe("toAbortError", () => {
  it("abort_error を組み立てる", () => {
    const reason = new Error("user abort");
    expect(toAbortError("https://example.com/", reason)).toEqual({
      type: "abort_error",
      url: "https://example.com/",
      reason,
    });
  });
});
