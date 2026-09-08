import * as E from "fp-ts/Either";
// oxlint-disable-next-line vite-plus/prefer-vite-plus-imports
import type { MatcherResult, MatcherState } from "vitest";

export interface ToBeRightWithAsyncMatcher<T = any> {
  toBeRightWithAsync(
    callback: (
      value: 0 extends 1 & T
        ? any
        : [T] extends [E.Either<unknown, infer A>]
          ? A
          : any,
    ) => void | Promise<void>,
  ): Promise<void>;
}

export async function toBeRightWithAsync(
  this: MatcherState,
  received: unknown,
  callback: (value: any) => void | Promise<void>,
): Promise<Extract<MatcherResult, { pass: boolean }>> {
  const { matcherHint, printReceived } = this.utils;
  const hint = matcherHint(".toBeRightWithAsync", "received", "callback");
  if (this.isNot) {
    throw new Error(
      `${hint}\n\n.toBeRightWithAsync does not support .not. Assert the inner value directly.`,
    );
  }
  if (typeof callback !== "function") {
    return {
      pass: false,
      message: () =>
        `${hint}\n\nCallback must be a function:\n  ${printReceived(callback)}`,
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
    const resolved = (await callback(either.right)) as unknown;
    if (resolved !== undefined) {
      console.warn(
        "[toBeRightWithAsync] callback return value is ignored. Use expect() inside the callback instead of returning a value.",
      );
    }
    return {
      pass: true,
      message: () =>
        `${hint}\n\nExpected value not to be Right, but received Right:\n  ${printReceived(either.right)}`,
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
