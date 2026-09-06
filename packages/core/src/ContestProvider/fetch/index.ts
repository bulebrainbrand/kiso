import type { FetchError, FetchFn } from "@kiso/types";
import * as E from "fp-ts/Either";

import { attemptOnce, discardBody } from "./attempt.ts";
import { decide } from "./decide.ts";
import { waitForRetry } from "./delay.ts";
import { normalizeOptions, type RetryPolicy } from "./policy.ts";
import {
  isBodyRetryable,
  isMethodRetryable,
  resolveUrl,
  resolveUserSignal,
} from "./request.ts";

export const kisoFetch: FetchFn = (input, init, options) => {
  const {
    maxRetries,
    initialDelayMs,
    backoff,
    maxDelayMs,
    retryOn,
    timeoutMs,
  } = normalizeOptions(options);
  const url = resolveUrl(input);
  const userSignal = resolveUserSignal(input, init);
  const methodRetryable = isMethodRetryable(input, init);
  const policy: RetryPolicy = {
    url,
    maxRetries,
    retryOn,
    methodRetryable,
    bodyRetryable: isBodyRetryable(init),
    timeoutMs,
  };

  const run = async (): Promise<E.Either<FetchError, Response>> => {
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
      )();
      if (E.isLeft(waited)) {
        return E.left(waited.left);
      }
    }
  };

  return run;
};

export {
  cloneInput,
  isBodyRetryable,
  isMethodRetryable,
  resolveMethod,
  resolveUrl,
  resolveUserSignal,
} from "./request.ts";
export { isRetryableStatus } from "./policy.ts";
export { computeDelay, sleep, waitForRetry } from "./delay.ts";
export { decide } from "./decide.ts";
export type { AttemptOutcome } from "./attempt.ts";
export type { Decision } from "./decide.ts";
export type { RetryPolicy } from "./policy.ts";
