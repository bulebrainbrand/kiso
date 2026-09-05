import { Err, Ok, Result } from "neverthrow";
import * as v from "valibot";

import { ConfigSchema, type Config } from "./configSchema.ts";
import { findConfig } from "./findConfig.ts";
import { runConfig } from "./runConfig.ts";
export const readConfig = (cwd: string) =>
  findConfig(cwd)
    .asyncAndThen((path) => runConfig(path))
    .andThen(
      (
        raw,
      ): Result<
        Config,
        { type: "parse_error"; error: v.InferIssue<typeof ConfigSchema>[] }
      > => {
        const result = v.safeParse(ConfigSchema, raw);
        if (result.success) {
          return new Ok(result.output);
        }
        return new Err({ type: "parse_error" as const, error: result.issues });
      },
    );
