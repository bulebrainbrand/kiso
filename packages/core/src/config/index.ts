import { dirname } from "node:path";

import * as E from "fp-ts/Either";
import { pipe } from "fp-ts/function";
import * as TE from "fp-ts/TaskEither";
import * as v from "valibot";

import { ConfigSchema, type Config } from "./configSchema.ts";
import {
  findConfig,
  type FindConfigIsDirectoryError,
  type FindConfigNotFoundError,
} from "./findConfig.ts";
import { runConfig, type RunConfigError } from "./runConfig.ts";
export type ReadConfigParseError = {
  type: "parse_error";
  error: v.InferIssue<typeof ConfigSchema>[];
};
export type ReadConfigError =
  | FindConfigNotFoundError
  | FindConfigIsDirectoryError
  | RunConfigError
  | ReadConfigParseError;
export type ReadConfigSuccess = {
  config: Config;
  // kiso.workspace.ts (KISO_CONFIG_FILE_NAME) があるディレクトリを root とする
  workspaceRoot: string;
};
export const readConfig = (
  cwd: string,
): TE.TaskEither<ReadConfigError, ReadConfigSuccess> =>
  pipe(
    TE.fromEither(findConfig(cwd)),
    TE.chainW((configPath) =>
      pipe(
        runConfig(configPath),
        TE.chainEitherKW((raw): E.Either<ReadConfigParseError, Config> => {
          const result = v.safeParse(ConfigSchema, raw);
          if (result.success) {
            return E.right(result.output);
          }
          return E.left({ type: "parse_error" as const, error: result.issues });
        }),
        TE.map((config) => ({
          config,
          workspaceRoot: dirname(configPath),
        })),
      ),
    ),
  );
