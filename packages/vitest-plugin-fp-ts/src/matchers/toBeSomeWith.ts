import * as O from "fp-ts/Option";
// oxlint-disable-next-line vite-plus/prefer-vite-plus-imports
import type { MatcherResult, MatcherState } from "vitest";

export interface ToBeSomeWithMatcher<T = any> {
  toBeSomeWith(
    predicate: (
      value: 0 extends 1 & T ? any : [T] extends [O.Option<infer A>] ? A : any,
    ) => boolean,
  ): void;
}

export function toBeSomeWith(
  this: MatcherState,
  received: unknown,
  predicate: (value: any) => boolean,
): MatcherResult {
  const { matcherHint, printReceived } = this.utils;
  const hint = matcherHint(".toBeSomeWith", "received", "predicate");
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
        `${hint}\n\nReceived value must be an fp-ts Option:\n  ${printReceived(received)}`,
      actual: received,
    };
  }
  const option = received as O.Option<unknown>;
  if (O.isSome(option)) {
    const pass = predicate(option.value) === true;
    return {
      pass,
      message: () =>
        pass
          ? `${hint}\n\nExpected Some value not to satisfy predicate, but it did:\n  ${printReceived(option.value)}`
          : `${hint}\n\nExpected Some value to satisfy predicate, but it did not:\n  ${printReceived(option.value)}`,
      actual: option.value,
    };
  }
  if (O.isNone(option)) {
    return {
      pass: false,
      message: () =>
        `${hint}\n\nExpected Some, but received None:\n  ${printReceived(option)}`,
      actual: option,
    };
  }
  return {
    pass: false,
    message: () =>
      `${hint}\n\nReceived value must be an fp-ts Option:\n  ${printReceived(received)}`,
    actual: received,
  };
}
