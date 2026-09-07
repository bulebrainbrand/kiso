import { expect } from "vite-plus/test";

import { matchers } from "./index.ts";

expect.extend(matchers);

export * from "./index.ts";
