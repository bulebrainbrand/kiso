import { Err, Ok, type Result } from "neverthrow";
import type { FetchError, FetchOptions } from "@kiso/types";
import { toAbortError } from "./policy.ts";

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

export type DelayConfig = {
  initialDelayMs: number;
  backoff: NonNullable<FetchOptions["backoff"]>;
  maxDelayMs: number | undefined;
};

export const waitForRetry = async (
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
