import * as E from "fp-ts/Either";
// oxlint-disable-next-line vite-plus/prefer-vite-plus-imports
import type { MatcherResult, MatcherState } from "vitest";

export interface ToBeRightWithMatcher {
  toBeRightWith(predicate: (value: any) => boolean): void;
}

export function toBeRightWith(
  this: MatcherState,
  received: unknown,
  predicate: (value: any) => boolean,
): MatcherResult {
  const { matcherHint, printReceived } = this.utils;
  const hint = matcherHint(".toBeRightWith", "received", "predicate");
  const either = received as E.Either<unknown, unknown>;
  if (E.isRight(either)) {
    const pass = predicate(either.right) === true;
    return {
      pass,
      message: () =>
        pass
          ? `${hint}\n\nExpected Right value not to satisfy predicate, but it did:\n  ${printReceived(either.right)}`
          : `${hint}\n\nExpected Right value to satisfy predicate, but it did not:\n  ${printReceived(either.right)}`,
      actual: either.right,
    };
  }
  if (E.isLeft(either)) {
    return {
      pass: false,
      message: () =>
        `${hint}\n\nExpected Right, but received Left:\n  ${printReceived(either.left)}`,
      actual: either,
    };
  }
  return {
    pass: false,
    message: () =>
      `${hint}\n\nReceived value must be an fp-ts Either:\n  ${printReceived(received)}`,
    actual: received,
  };
}
