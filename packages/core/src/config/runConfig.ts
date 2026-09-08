import * as TE from "fp-ts/TaskEither";

import { createConfigJiti } from "./createJiti.ts";

let jiti = createConfigJiti();
export type RunConfigError = {
  type: "jiti_error";
  error: unknown;
};
export const runConfig = (
  path: string,
): TE.TaskEither<RunConfigError, unknown> =>
  TE.tryCatch(
    () => jiti.import(path),
    (error): RunConfigError => ({
      type: "jiti_error",
      error,
    }),
  );
