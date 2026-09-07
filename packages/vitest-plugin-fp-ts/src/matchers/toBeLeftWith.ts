import * as E from "fp-ts/Either";
// oxlint-disable-next-line vite-plus/prefer-vite-plus-imports
import type { MatcherResult, MatcherState } from "vitest";

export interface ToBeLeftWithMatcher<T = any> {
  toBeLeftWith(
    predicate: (
      value: 0 extends 1 & T
        ? any
        : [T] extends [E.Either<infer L, unknown>]
          ? L
          : any,
    ) => boolean,
  ): void;
}

export function toBeLeftWith(
  this: MatcherState,
  received: unknown,
  predicate: (value: any) => boolean,
): MatcherResult {
  const { matcherHint, printReceived } = this.utils;
  const hint = matcherHint(".toBeLeftWith", "received", "predicate");
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
  if (E.isLeft(either)) {
    const pass = predicate(either.left) === true;
    return {
      pass,
      message: () =>
        pass
          ? `${hint}\n\nExpected Left value not to satisfy predicate, but it did:\n  ${printReceived(either.left)}`
          : `${hint}\n\nExpected Left value to satisfy predicate, but it did not:\n  ${printReceived(either.left)}`,
      actual: either.left,
    };
  }
  if (E.isRight(either)) {
    return {
      pass: false,
      message: () =>
        `${hint}\n\nExpected Left, but received Right:\n  ${printReceived(either.right)}`,
      actual: either.right,
    };
  }
  return {
    pass: false,
    message: () =>
      `${hint}\n\nReceived value must be an fp-ts Either:\n  ${printReceived(received)}`,
    actual: received,
  };
}
