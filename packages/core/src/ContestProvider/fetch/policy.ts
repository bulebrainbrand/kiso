import type { FetchError, FetchOptions } from "@kiso/types";

const DEFAULT_MAX_RETRIES = 0;
const DEFAULT_INITIAL_DELAY_MS = 100;
const DEFAULT_BACKOFF = "exponential" satisfies FetchOptions["backoff"];
const DEFAULT_TIMEOUT_MS: number | undefined = undefined;

export const defaultRetryOn = (status: number): boolean =>
  status === 429 || (status >= 500 && status <= 599);

export const isRetryableStatus = (
  status: number,
  retryOn: NonNullable<FetchOptions["retryOn"]>,
): boolean => {
  if (typeof retryOn === "function") return retryOn(status);
  return retryOn.includes(status);
};

export const normalizeOptions = (options?: FetchOptions) => {
  const rawMaxRetries = options?.maxRetries ?? DEFAULT_MAX_RETRIES;
  const maxRetries = Number.isFinite(rawMaxRetries)
    ? Math.max(0, Math.floor(rawMaxRetries))
    : DEFAULT_MAX_RETRIES;
  const initialDelayMs = Math.max(0, options?.initialDelayMs ?? DEFAULT_INITIAL_DELAY_MS);
  const backoff = options?.backoff ?? DEFAULT_BACKOFF;
  const maxDelayMs = options?.maxDelayMs;
  const retryOn = options?.retryOn ?? defaultRetryOn;
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  return { maxRetries, initialDelayMs, backoff, maxDelayMs, retryOn, timeoutMs };
};

export type RetryPolicy = {
  url: string;
  maxRetries: number;
  retryOn: NonNullable<FetchOptions["retryOn"]>;
  methodRetryable: boolean;
  timeoutMs: number | undefined;
};

export const toAbortError = (
  url: string,
  reason: unknown,
): Extract<FetchError, { type: "abort_error" }> => ({
  type: "abort_error",
  url,
  reason,
});
