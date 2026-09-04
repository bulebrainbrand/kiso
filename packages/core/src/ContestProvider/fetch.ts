import { Err, Ok, ResultAsync, type Result } from "neverthrow";
import type { FetchFn, FetchOptions } from "@kiso/types";

const DEFAULT_MAX_RETRIES = 0;
const DEFAULT_INITIAL_DELAY_MS = 100;
const DEFAULT_BACKOFF = "exponential" as const;
const DEFAULT_TIMEOUT_MS: number | undefined = undefined;

export const resolveUrl = (input: string | URL | Request): string => {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.href;
  return input.url;
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
): Extract<import("@kiso/types").FetchError, { type: "abort_error" }> => ({
  type: "abort_error",
  url,
  reason,
});

export const kisoFetch: FetchFn = (input, init, options) => {
  const { maxRetries, initialDelayMs, backoff, maxDelayMs, retryOn, timeoutMs } =
    normalizeOptions(options);
  const url = resolveUrl(input);

  const run = async (): Promise<Result<Response, import("@kiso/types").FetchError>> => {
    for (let attempt = 0; ; attempt++) {
      const controller = new AbortController();
      const userSignal = init?.signal ?? (input instanceof Request ? input.signal : undefined);
      if (userSignal?.aborted) {
        return new Err(toAbortError(url, userSignal.reason));
      }
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

      let response: Response | undefined;
      try {
        response = await globalThis.fetch(input, { ...init, signal: controller.signal });
      } catch (error) {
        if (timeoutId !== undefined) clearTimeout(timeoutId);
        userSignal?.removeEventListener("abort", onUserAbort);
        if (timedOut) {
          if (attempt < maxRetries) {
            try {
              await sleep(computeDelay(attempt, initialDelayMs, backoff, maxDelayMs), userSignal);
            } catch (reason) {
              return new Err(toAbortError(url, reason));
            }
            continue;
          }
          return new Err({ type: "timeout_error", url, timeoutMs: timeoutMs ?? 0 });
        }
        if (controller.signal.aborted) {
          return new Err(toAbortError(url, controller.signal.reason));
        }
        const message = error instanceof Error ? error.message : String(error);
        if (attempt < maxRetries) {
          try {
            await sleep(computeDelay(attempt, initialDelayMs, backoff, maxDelayMs), userSignal);
          } catch (reason) {
            return new Err(toAbortError(url, reason));
          }
          continue;
        }
        return new Err({ type: "network_error", url, message, cause: error });
      }

      if (timeoutId !== undefined) clearTimeout(timeoutId);
      userSignal?.removeEventListener("abort", onUserAbort);

      if (response.ok) {
        return new Ok(response);
      }
      if (response.status === 404) {
        return new Err({ type: "not_found", url });
      }
      const retryable = isRetryableStatus(response.status, retryOn);
      if (retryable && attempt < maxRetries) {
        try {
          await sleep(computeDelay(attempt, initialDelayMs, backoff, maxDelayMs), userSignal);
        } catch (reason) {
          return new Err(toAbortError(url, reason));
        }
        continue;
      }
      return new Err({
        type: "fetch_error",
        status: response.status,
        error: response.statusText,
      });
    }
  };

  return new ResultAsync(run());
};
