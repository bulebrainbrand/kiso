import type { FS } from "../types/fs.ts";
import { findConfig } from "./findConfig.ts";
import { runConfig } from "./runConfig.ts";
import { ConfigSchema, type Config } from "./configSchema.ts";
import * as v from "valibot";
import { Err, Ok, Result } from "neverthrow";
export const readConfig = (cwd: string, fs: FS) =>
  findConfig(fs, cwd)
    .asyncAndThen((path) => runConfig(path))
    .andThen(
      (
        raw,
      ): Result<Config, { type: "parse_error"; error: v.InferIssue<typeof ConfigSchema>[] }> => {
        const result = v.safeParse(ConfigSchema, raw);
        if (result.success) {
          return new Ok(result.output);
        }
        return new Err({ type: "parse_error" as const, error: result.issues });
      },
    );
