import type { Config } from "./configSchema.ts";

export function defineConfig<const T extends Config>(config: T): T {
  return config;
}
