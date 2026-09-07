// oxlint-disable-next-line vite-plus/prefer-vite-plus-imports
import type { Matcher } from "vitest";

import { toBeLeft, type ToBeLeftMatcher } from "./toBeLeft.ts";
import { toBeLeftWith, type ToBeLeftWithMatcher } from "./toBeLeftWith.ts";
import { toBeRight, type ToBeRightMatcher } from "./toBeRight.ts";
import { toBeRightWith, type ToBeRightWithMatcher } from "./toBeRightWith.ts";
import {
  toStrictEqualLeft,
  type ToStrictEqualLeftMatcher,
} from "./toStrictEqualLeft.ts";
import {
  toStrictEqualRight,
  type ToStrictEqualRightMatcher,
} from "./toStrictEqualRight.ts";

export interface FpTsMatchers
  extends
    ToBeRightMatcher,
    ToBeLeftMatcher,
    ToStrictEqualRightMatcher,
    ToStrictEqualLeftMatcher,
    ToBeRightWithMatcher,
    ToBeLeftWithMatcher {}

export const matchers: Record<string, Matcher> = {
  toBeRight,
  toBeLeft,
  toStrictEqualRight,
  toStrictEqualLeft,
  toBeRightWith,
  toBeLeftWith,
};
