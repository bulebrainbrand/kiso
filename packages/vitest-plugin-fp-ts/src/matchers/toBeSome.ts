import * as O from "fp-ts/Option";
// oxlint-disable-next-line vite-plus/prefer-vite-plus-imports
import type { MatcherResult, MatcherState } from "vitest";

export interface ToBeSomeMatcher {
  toBeSome(expected?: unknown): void;
}

export function toBeSome(
  this: MatcherState,
  received: unknown,
  ...args: [] | [expected: unknown]
): MatcherResult {
  const { matcherHint, printExpected, printReceived } = this.utils;
  const hint = matcherHint(".toBeSome", "received", "expected");
  const hasExpected = args.length > 0;
  const expected = args[0];
  if (typeof received !== "object" || received === null) {
    return {
      pass: false,
      message: () =>
        `${hint}\n\nReceived value must be an fp-ts Option:\n  ${printReceived(received)}`,
      actual: received,
      ...(hasExpected ? { expected } : {}),
    };
  }
  const option = received as O.Option<unknown>;
  if (O.isSome(option)) {
    if (!hasExpected) {
      return {
        pass: true,
        message: () =>
          `${hint}\n\nExpected value not to be Some, but received Some:\n  ${printReceived(option.value)}`,
      };
    }
    const pass = this.equals(option.value, expected, [
      ...this.customTesters,
      this.utils.iterableEquality,
    ]);
    return {
      pass,
      message: () =>
        pass
          ? `${hint}\n\nExpected Some not to equal:\n  ${printExpected(expected)}\nReceived Some:\n  ${printReceived(option.value)}`
          : `${hint}\n\nExpected Some to equal:\n  ${printExpected(expected)}\nReceived Some:\n  ${printReceived(option.value)}`,
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
      ...(hasExpected ? { expected } : {}),
    };
  }
  return {
    pass: false,
    message: () =>
      `${hint}\n\nReceived value must be an fp-ts Option:\n  ${printReceived(received)}`,
    actual: received,
    ...(hasExpected ? { expected } : {}),
  };
}
