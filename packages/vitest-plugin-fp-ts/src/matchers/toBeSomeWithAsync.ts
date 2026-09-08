import * as O from "fp-ts/Option";
// oxlint-disable-next-line vite-plus/prefer-vite-plus-imports
import type { MatcherResult, MatcherState } from "vitest";

export interface ToBeSomeWithAsyncMatcher<T = any> {
  toBeSomeWithAsync(
    callback: (
      value: 0 extends 1 & T ? any : [T] extends [O.Option<infer A>] ? A : any,
    ) => void | Promise<void>,
  ): Promise<void>;
}

export async function toBeSomeWithAsync(
  this: MatcherState,
  received: unknown,
  callback: (value: any) => void | Promise<void>,
): Promise<Extract<MatcherResult, { pass: boolean }>> {
  const { matcherHint, printReceived } = this.utils;
  const hint = matcherHint(".toBeSomeWithAsync", "received", "callback");
  if (this.isNot) {
    throw new Error(
      `${hint}\n\n.toBeSomeWithAsync does not support .not. Assert the inner value directly.`,
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
        `${hint}\n\nReceived value must be an fp-ts Option:\n  ${printReceived(received)}`,
      actual: received,
    };
  }
  const option = received as O.Option<unknown>;
  if (O.isSome(option)) {
    const resolved = (await callback(option.value)) as unknown;
    if (resolved !== undefined) {
      console.warn(
        "[toBeSomeWithAsync] callback return value is ignored. Use expect() inside the callback instead of returning a value.",
      );
    }
    return {
      pass: true,
      message: () =>
        `${hint}\n\nExpected value not to be Some, but received Some:\n  ${printReceived(option.value)}`,
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
