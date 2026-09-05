import { Err, Ok, ResultAsync, type Result } from "neverthrow";
import type { FetchError, FetchFn, FetchOptions } from "@kiso/types";
const DEFAULT_MAX_RETRIES = 0;
const DEFAULT_INITIAL_DELAY_MS = 100;
const DEFAULT_BACKOFF = "exponential" satisfies FetchOptions["backoff"];
const DEFAULT_TIMEOUT_MS: number | undefined = undefined;

export const resolveUrl = (input: string | URL | Request): string => {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.href;
  return input.url;
};

const IDEMPOTENT_METHODS = new Set(["GET", "HEAD", "OPTIONS", "TRACE", "PUT", "DELETE", "QUERY"]);

export const resolveMethod = (input: string | URL | Request, init?: RequestInit): string => {
  const raw = init?.method ?? (input instanceof Request ? input.method : undefined) ?? "GET";
  return raw.toUpperCase();
};

export const isRetryableStatus = (
  status: number,
  retryOn: NonNullable<FetchOptions["retryOn"]>,
): boolean => {
  if (typeof retryOn === "function") return retryOn(status);
  return retryOn.includes(status);
};

const defaultRetryOn = (status: number): boolean =>
  status === 429 || (status >= 500 && status <= 599);

export const computeDelay = (
  retryIndex: number,
  initialDelayMs: number,
  backoff: NonNullable<FetchOptions["backoff"]>,
  maxDelayMs: number | undefined,
): number => {
  const base = backoff === "exponential" ? initialDelayMs * 2 ** retryIndex : initialDelayMs;
  if (maxDelayMs === undefined) return base;
  return Math.min(base, maxDelayMs);
};

const sleep = (ms: number, signal?: AbortSignal | null): Promise<void> => {
  if (signal?.aborted) return Promise.reject(signal.reason);
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const onAbort = () => {
      clearTimeout(timeoutId);
      reject(signal?.reason);
    };
    const timeoutId = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    signal?.addEventListener("abort", onAbort, { once: true });
  });
};

const normalizeOptions = (options?: FetchOptions) => {
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

const toAbortError = (
  url: string,
  reason: unknown,
): Extract<FetchError, { type: "abort_error" }> => ({
  type: "abort_error",
  url,
  reason,
});

export type AttemptOutcome =
  | { type: "preAborted"; reason: unknown }
  | { type: "responded"; response: Response }
  | { type: "thrown"; error: unknown; timedOut: boolean; aborted: boolean; abortReason: unknown };

export type RetryPolicy = {
  url: string;
  maxRetries: number;
  retryOn: NonNullable<FetchOptions["retryOn"]>;
  methodRetryable: boolean;
  timeoutMs: number | undefined;
};

export type Decision =
  | { type: "retry"; discard?: Response }
  | { type: "return"; result: Result<Response, FetchError>; discard?: Response };

const attemptOnce = async (
  input: string | URL | Request,
  init: RequestInit | undefined,
  userSignal: AbortSignal | null | undefined,
  timeoutMs: number | undefined,
): Promise<AttemptOutcome> => {
  if (userSignal?.aborted) {
    return { type: "preAborted", reason: userSignal.reason };
  }
  const controller = new AbortController();
  const onUserAbort = () => {
    controller.abort(userSignal?.reason);
  };
  userSignal?.addEventListener("abort", onUserAbort, { once: true });
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  let timedOut = false;
  if (timeoutMs !== undefined) {
    timeoutId = setTimeout(() => {
      timedOut = true;
      controller.abort(new DOMException("fetch timeout", "TimeoutError"));
    }, timeoutMs);
  }
  try {
    const response = await fetch(input, { ...init, signal: controller.signal });
    return { type: "responded", response };
  } catch (error) {
    return {
      type: "thrown",
      error,
      timedOut,
      aborted: controller.signal.aborted,
      abortReason: controller.signal.reason,
    };
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
    userSignal?.removeEventListener("abort", onUserAbort);
  }
};

export const decide = (outcome: AttemptOutcome, policy: RetryPolicy, attempt: number): Decision => {
  const retryable = attempt < policy.maxRetries && policy.methodRetryable;
  switch (outcome.type) {
    case "preAborted":
      return { type: "return", result: new Err(toAbortError(policy.url, outcome.reason)) };
    case "thrown": {
      if (outcome.timedOut) {
        return retryable
          ? { type: "retry" }
          : {
              type: "return",
              result: new Err({
                type: "timeout_error",
                url: policy.url,
                timeoutMs: policy.timeoutMs ?? 0,
              }),
            };
      }
      if (outcome.aborted) {
        return { type: "return", result: new Err(toAbortError(policy.url, outcome.abortReason)) };
      }
      const message =
        outcome.error instanceof Error ? outcome.error.message : String(outcome.error);
      return retryable
        ? { type: "retry" }
        : {
            type: "return",
            result: new Err({
              type: "network_error",
              url: policy.url,
              message,
              cause: outcome.error,
            }),
          };
    }
    case "responded": {
      const { response } = outcome;
      if (response.ok) {
        return { type: "return", result: new Ok(response) };
      }
      if (response.status === 404) {
        return {
          type: "return",
          result: new Err({ type: "not_found", url: policy.url }),
          discard: response,
        };
      }
      if (retryable && isRetryableStatus(response.status, policy.retryOn)) {
        return { type: "retry", discard: response };
      }
      return {
        type: "return",
        result: new Err({
          type: "fetch_error",
          status: response.status,
          error: response.statusText,
        }),
        discard: response,
      };
    }
  }
};

type DelayConfig = {
  initialDelayMs: number;
  backoff: NonNullable<FetchOptions["backoff"]>;
  maxDelayMs: number | undefined;
};

const waitForRetry = async (
  attempt: number,
  config: DelayConfig,
  url: string,
  userSignal: AbortSignal | null | undefined,
): Promise<Result<void, FetchError>> => {
  try {
    await sleep(
      computeDelay(attempt, config.initialDelayMs, config.backoff, config.maxDelayMs),
      userSignal,
    );
    return new Ok(undefined);
  } catch (reason) {
    return new Err(toAbortError(url, reason));
  }
};

const discardBody = async (response: Response | undefined): Promise<void> => {
  try {
    await response?.body?.cancel();
  } catch {}
};

export const kisoFetch: FetchFn = (input, init, options) => {
  const { maxRetries, initialDelayMs, backoff, maxDelayMs, retryOn, timeoutMs } =
    normalizeOptions(options);
  const url = resolveUrl(input);
  const userSignal = init?.signal ?? (input instanceof Request ? input.signal : undefined);
  const methodRetryable = IDEMPOTENT_METHODS.has(resolveMethod(input, init));
  const policy: RetryPolicy = { url, maxRetries, retryOn, methodRetryable, timeoutMs };

  const run = async (): Promise<Result<Response, FetchError>> => {
    for (let attempt = 0; ; attempt++) {
      const outcome = await attemptOnce(input, init, userSignal, timeoutMs);
      const decision = decide(outcome, policy, attempt);
      await discardBody(decision.discard);
      if (decision.type === "return") {
        return decision.result;
      }
      const waited = await waitForRetry(
        attempt,
        { initialDelayMs, backoff, maxDelayMs },
        url,
        userSignal,
      );
      if (waited.isErr()) {
        return new Err(waited.error);
      }
    }
  };

  return new ResultAsync(run());
};
