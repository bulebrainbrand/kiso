// oxlint-disable-next-line vite-plus/prefer-vite-plus-imports
import { expect } from "vitest";

import { matchers } from "./index.ts";

expect.extend(matchers);

export * from "./index.ts";
