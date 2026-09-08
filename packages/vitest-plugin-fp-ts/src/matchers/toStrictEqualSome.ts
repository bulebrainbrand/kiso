import * as O from "fp-ts/Option";
// oxlint-disable-next-line vite-plus/prefer-vite-plus-imports
import type { MatcherResult, MatcherState } from "vitest";

export interface ToStrictEqualSomeMatcher {
  toStrictEqualSome(expected: unknown): void;
}

export function toStrictEqualSome(
  this: MatcherState,
  received: unknown,
  expected: unknown,
): MatcherResult {
  const { matcherHint, printExpected, printReceived } = this.utils;
  const hint = matcherHint(".toStrictEqualSome", "received", "expected");
  if (typeof received !== "object" || received === null) {
    return {
      pass: false,
      message: () =>
        `${hint}\n\nReceived value must be an fp-ts Option:\n  ${printReceived(received)}`,
      actual: received,
      expected,
    };
  }
  const option = received as O.Option<unknown>;
  if (O.isSome(option)) {
    const pass = this.equals(
      option.value,
      expected,
      [...this.customTesters, this.utils.iterableEquality],
      true,
    );
    return {
      pass,
      message: () =>
        pass
          ? `${hint}\n\nExpected Some not to strictly equal:\n  ${printExpected(expected)}\nReceived Some:\n  ${printReceived(option.value)}`
          : `${hint}\n\nExpected Some to strictly equal:\n  ${printExpected(expected)}\nReceived Some:\n  ${printReceived(option.value)}`,
      actual: option.value,
      expected,
    };
  }
  if (O.isNone(option)) {
    return {
      pass: false,
      message: () =>
        `${hint}\n\nExpected Some, but received None:\n  ${printReceived(option)}`,
      actual: option,
      expected,
    };
  }
  return {
    pass: false,
    message: () =>
      `${hint}\n\nReceived value must be an fp-ts Option:\n  ${printReceived(received)}`,
    actual: received,
    expected,
  };
}
