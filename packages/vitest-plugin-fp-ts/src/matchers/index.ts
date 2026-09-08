// oxlint-disable-next-line vite-plus/prefer-vite-plus-imports
import type { Matcher } from "vitest";

import { toBeLeft, type ToBeLeftMatcher } from "./toBeLeft.ts";
import { toBeLeftWith, type ToBeLeftWithMatcher } from "./toBeLeftWith.ts";
import { toBeNone, type ToBeNoneMatcher } from "./toBeNone.ts";
import { toBeRight, type ToBeRightMatcher } from "./toBeRight.ts";
import { toBeRightWith, type ToBeRightWithMatcher } from "./toBeRightWith.ts";
import { toBeSome, type ToBeSomeMatcher } from "./toBeSome.ts";
import { toBeSomeWith, type ToBeSomeWithMatcher } from "./toBeSomeWith.ts";
import {
  toStrictEqualLeft,
  type ToStrictEqualLeftMatcher,
} from "./toStrictEqualLeft.ts";
import {
  toStrictEqualRight,
  type ToStrictEqualRightMatcher,
} from "./toStrictEqualRight.ts";
import {
  toStrictEqualSome,
  type ToStrictEqualSomeMatcher,
} from "./toStrictEqualSome.ts";

export interface FpTsMatchers<T = any>
  extends
    ToBeRightMatcher,
    ToBeLeftMatcher,
    ToStrictEqualRightMatcher,
    ToStrictEqualLeftMatcher,
    ToBeRightWithMatcher<T>,
    ToBeLeftWithMatcher<T>,
    ToBeSomeMatcher,
    ToBeNoneMatcher,
    ToStrictEqualSomeMatcher,
    ToBeSomeWithMatcher<T> {}

export const matchers: {
  toBeRight: Matcher;
  toBeLeft: Matcher;
  toStrictEqualRight: Matcher;
  toStrictEqualLeft: Matcher;
  toBeRightWith: Matcher;
  toBeLeftWith: Matcher;
  toBeSome: Matcher;
  toBeNone: Matcher;
  toStrictEqualSome: Matcher;
  toBeSomeWith: Matcher;
} = {
  toBeRight,
  toBeLeft,
  toStrictEqualRight,
  toStrictEqualLeft,
  toBeRightWith,
  toBeLeftWith,
  toBeSome,
  toBeNone,
  toStrictEqualSome,
  toBeSomeWith,
};
