import * as E from "fp-ts/Either";
// oxlint-disable-next-line vite-plus/prefer-vite-plus-imports
import type { MatcherResult, MatcherState } from "vitest";

export interface ToStrictEqualLeftMatcher {
  toStrictEqualLeft(expected: unknown): void;
}

export function toStrictEqualLeft(
  this: MatcherState,
  received: unknown,
  expected: unknown,
): MatcherResult {
  const { matcherHint, printExpected, printReceived } = this.utils;
  const hint = matcherHint(".toStrictEqualLeft", "received", "expected");
  if (typeof received !== "object" || received === null) {
    return {
      pass: false,
      message: () =>
        `${hint}\n\nReceived value must be an fp-ts Either:\n  ${printReceived(received)}`,
      actual: received,
      expected,
    };
  }
  const either = received as E.Either<unknown, unknown>;
  if (E.isLeft(either)) {
    const pass = this.equals(
      either.left,
      expected,
      [...this.customTesters, this.utils.iterableEquality],
      true,
    );
    return {
      pass,
      message: () =>
        pass
          ? `${hint}\n\nExpected Left not to strictly equal:\n  ${printExpected(expected)}\nReceived Left:\n  ${printReceived(either.left)}`
          : `${hint}\n\nExpected Left to strictly equal:\n  ${printExpected(expected)}\nReceived Left:\n  ${printReceived(either.left)}`,
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
      expected,
    };
  }
  return {
    pass: false,
    message: () =>
      `${hint}\n\nReceived value must be an fp-ts Either:\n  ${printReceived(received)}`,
    actual: received,
    expected,
  };
}
