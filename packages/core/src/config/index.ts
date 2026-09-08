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
export const readConfig = (
  cwd: string,
): TE.TaskEither<ReadConfigError, Config> =>
  pipe(
    TE.fromEither(findConfig(cwd)),
    TE.chainW((path) => runConfig(path)),
    TE.chainEitherKW((raw): E.Either<ReadConfigParseError, Config> => {
      const result = v.safeParse(ConfigSchema, raw);
      if (result.success) {
        return E.right(result.output);
      }
      return E.left({ type: "parse_error" as const, error: result.issues });
    }),
  );
