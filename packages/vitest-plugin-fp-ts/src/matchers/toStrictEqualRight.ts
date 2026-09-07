import * as E from "fp-ts/Either";
// oxlint-disable-next-line vite-plus/prefer-vite-plus-imports
import type { MatcherResult, MatcherState } from "vitest";

export interface ToStrictEqualRightMatcher {
  toStrictEqualRight(expected: unknown): void;
}

export function toStrictEqualRight(
  this: MatcherState,
  received: unknown,
  expected: unknown,
): MatcherResult {
  const { matcherHint, printExpected, printReceived } = this.utils;
  const hint = matcherHint(".toStrictEqualRight", "received", "expected");
  const either = received as E.Either<unknown, unknown>;
  if (E.isRight(either)) {
    const pass = this.equals(
      either.right,
      expected,
      [...this.customTesters, this.utils.iterableEquality],
      true,
    );
    return {
      pass,
      message: () =>
        pass
          ? `${hint}\n\nExpected Right not to strictly equal:\n  ${printExpected(expected)}\nReceived Right:\n  ${printReceived(either.right)}`
          : `${hint}\n\nExpected Right to strictly equal:\n  ${printExpected(expected)}\nReceived Right:\n  ${printReceived(either.right)}`,
      actual: either.right,
      expected,
    };
  }
  if (E.isLeft(either)) {
    return {
      pass: false,
      message: () =>
        `${hint}\n\nExpected Right, but received Left:\n  ${printReceived(either.left)}`,
      actual: either,
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
