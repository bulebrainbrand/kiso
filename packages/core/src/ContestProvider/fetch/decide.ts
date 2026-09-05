import type { FetchError } from "@kiso/types";
import { Err, Ok, type Result } from "neverthrow";

import type { AttemptOutcome } from "./attempt.ts";
import { isRetryableStatus, toAbortError, type RetryPolicy } from "./policy.ts";

export type Decision =
  | { type: "retry"; discard?: Response }
  | {
      type: "return";
      result: Result<Response, FetchError>;
      discard?: Response;
    };

export const decide = (
  outcome: AttemptOutcome,
  policy: RetryPolicy,
  attempt: number,
): Decision => {
  const retryable =
    attempt < policy.maxRetries
    && policy.methodRetryable
    && policy.bodyRetryable;
  switch (outcome.type) {
    case "preAborted":
      return {
        type: "return",
        result: new Err(toAbortError(policy.url, outcome.reason)),
      };
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
        return {
          type: "return",
          result: new Err(toAbortError(policy.url, outcome.abortReason)),
        };
      }
      const message =
        outcome.error instanceof Error
          ? outcome.error.message
          : String(outcome.error);
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
