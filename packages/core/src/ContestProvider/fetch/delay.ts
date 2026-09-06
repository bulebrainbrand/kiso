import type { FetchError, FetchOptions } from "@kiso/types";
import * as TE from "fp-ts/TaskEither";

import { toAbortError } from "./policy.ts";

// Node の setTimeout 上限。これを超えると TimeoutOverflowWarning のうえ約1msに丸められる。
const MAX_TIMER_MS = 2 ** 31 - 1;

export const computeDelay = (
  retryIndex: number,
  initialDelayMs: number,
  backoff: NonNullable<FetchOptions["backoff"]>,
  maxDelayMs: number | undefined,
): number => {
  const base =
    backoff === "exponential"
      ? initialDelayMs * 2 ** retryIndex
      : initialDelayMs;
  return Math.min(base, maxDelayMs ?? MAX_TIMER_MS, MAX_TIMER_MS);
};

export const sleep = (
  ms: number,
  signal?: AbortSignal | null,
): Promise<void> => {
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

export type DelayConfig = {
  initialDelayMs: number;
  backoff: NonNullable<FetchOptions["backoff"]>;
  maxDelayMs: number | undefined;
};

export const waitForRetry = (
  attempt: number,
  config: DelayConfig,
  url: string,
  userSignal: AbortSignal | null | undefined,
): TE.TaskEither<FetchError, void> =>
  TE.tryCatch(
    () =>
      sleep(
        computeDelay(
          attempt,
          config.initialDelayMs,
          config.backoff,
          config.maxDelayMs,
        ),
        userSignal,
      ),
    (reason) => toAbortError(url, reason),
  );
