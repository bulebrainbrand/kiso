import * as E from "fp-ts/Either";
import { pipe } from "fp-ts/function";
import * as TE from "fp-ts/TaskEither";
import * as v from "valibot";

import { ConfigSchema, type Config } from "./configSchema.ts";
import { findConfig } from "./findConfig.ts";
import { runConfig } from "./runConfig.ts";
export const readConfig = (cwd: string) =>
  pipe(
    TE.fromEither(findConfig(cwd)),
    TE.chainW((path) => runConfig(path)),
    TE.chainEitherKW(
      (
        raw,
      ): E.Either<
        { type: "parse_error"; error: v.InferIssue<typeof ConfigSchema>[] },
        Config
      > => {
        const result = v.safeParse(ConfigSchema, raw);
        if (result.success) {
          return E.right(result.output);
        }
        return E.left({ type: "parse_error" as const, error: result.issues });
      },
    ),
  );
