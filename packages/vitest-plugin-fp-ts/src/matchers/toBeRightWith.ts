import * as E from "fp-ts/Either";
// oxlint-disable-next-line vite-plus/prefer-vite-plus-imports
import type { MatcherResult, MatcherState } from "vitest";

export interface ToBeRightWithMatcher<T = any> {
  toBeRightWith(
    predicate: (
      value: 0 extends 1 & T
        ? any
        : [T] extends [E.Either<unknown, infer A>]
          ? A
          : any,
    ) => boolean,
  ): void;
}

export function toBeRightWith(
  this: MatcherState,
  received: unknown,
  predicate: (value: any) => boolean,
): MatcherResult {
  const { matcherHint, printReceived } = this.utils;
  const hint = matcherHint(".toBeRightWith", "received", "predicate");
  if (typeof predicate !== "function") {
    return {
      pass: false,
      message: () =>
        `${hint}\n\nPredicate must be a function:\n  ${printReceived(predicate)}`,
      actual: received,
    };
  }
  if (typeof received !== "object" || received === null) {
    return {
      pass: false,
      message: () =>
        `${hint}\n\nReceived value must be an fp-ts Either:\n  ${printReceived(received)}`,
      actual: received,
    };
  }
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
      actual: either.left,
    };
  }
  return {
    pass: false,
    message: () =>
      `${hint}\n\nReceived value must be an fp-ts Either:\n  ${printReceived(received)}`,
    actual: received,
  };
}
