import * as v from "valibot";

import type { JSONPrimitive } from "./storage.ts";
export type LoginSchema<
  A extends Record<string, JSONPrimitive>,
  O,
> = v.GenericSchema<A, O>;
