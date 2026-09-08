import * as O from "fp-ts/Option";
// oxlint-disable-next-line vite-plus/prefer-vite-plus-imports
import type { MatcherResult, MatcherState } from "vitest";

export interface ToBeNoneMatcher {
  toBeNone(): void;
}

export function toBeNone(this: MatcherState, received: unknown): MatcherResult {
  const { matcherHint, printReceived } = this.utils;
  const hint = matcherHint(".toBeNone", "received", "");
  if (typeof received !== "object" || received === null) {
    return {
      pass: false,
      message: () =>
        `${hint}\n\nReceived value must be an fp-ts Option:\n  ${printReceived(received)}`,
      actual: received,
    };
  }
  const option = received as O.Option<unknown>;
  if (O.isNone(option)) {
    return {
      pass: true,
      message: () =>
        `${hint}\n\nExpected value not to be None, but received None:\n  ${printReceived(option)}`,
    };
  }
  if (O.isSome(option)) {
    return {
      pass: false,
      message: () =>
        `${hint}\n\nExpected None, but received Some:\n  ${printReceived(option.value)}`,
      actual: option.value,
    };
  }
  return {
    pass: false,
    message: () =>
      `${hint}\n\nReceived value must be an fp-ts Option:\n  ${printReceived(received)}`,
    actual: received,
  };
}
