import * as E from "fp-ts/Either";
// oxlint-disable-next-line vite-plus/prefer-vite-plus-imports
import type { MatcherResult, MatcherState } from "vitest";

export interface ToBeLeftMatcher {
  toBeLeft(expected?: unknown): void;
}

export function toBeLeft(
  this: MatcherState,
  received: unknown,
  ...args: [] | [expected: unknown]
): MatcherResult {
  const { matcherHint, printExpected, printReceived } = this.utils;
  const hint = matcherHint(".toBeLeft", "received", "expected");
  const hasExpected = args.length > 0;
  const expected = args[0];
  if (typeof received !== "object" || received === null) {
    return {
      pass: false,
      message: () =>
        `${hint}\n\nReceived value must be an fp-ts Either:\n  ${printReceived(received)}`,
      actual: received,
      ...(hasExpected ? { expected } : {}),
    };
  }
  const either = received as E.Either<unknown, unknown>;
  if (E.isLeft(either)) {
    if (!hasExpected) {
      return {
        pass: true,
        message: () =>
          `${hint}\n\nExpected value not to be Left, but received Left:\n  ${printReceived(either.left)}`,
      };
    }
    const pass = this.equals(either.left, expected, [
      ...this.customTesters,
      this.utils.iterableEquality,
    ]);
    return {
      pass,
      message: () =>
        pass
          ? `${hint}\n\nExpected Left not to equal:\n  ${printExpected(expected)}\nReceived Left:\n  ${printReceived(either.left)}`
          : `${hint}\n\nExpected Left to equal:\n  ${printExpected(expected)}\nReceived Left:\n  ${printReceived(either.left)}`,
      actual: either.left,
      expected,
    };
  }
  if (E.isRight(either)) {
    return {
      pass: false,
      message: () =>
        `${hint}\n\nExpected Left, but received Right:\n  ${printReceived(either.right)}`,
      actual: either.right,
      ...(hasExpected ? { expected } : {}),
    };
  }
  return {
    pass: false,
    message: () =>
      `${hint}\n\nReceived value must be an fp-ts Either:\n  ${printReceived(received)}`,
    actual: received,
    ...(hasExpected ? { expected } : {}),
  };
}
