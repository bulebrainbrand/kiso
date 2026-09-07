import type { FpTsMatchers } from "./matchers/index.ts";

export { matchers } from "./matchers/index.ts";
export type { FpTsMatchers } from "./matchers/index.ts";

declare module "vitest" {
  interface Matchers<T = any> extends FpTsMatchers<T> {}
}
