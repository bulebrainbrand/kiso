import * as TE from "fp-ts/TaskEither";

import { createConfigJiti } from "./createJiti.ts";

let jiti = createConfigJiti();
export const runConfig = (
  path: string,
): TE.TaskEither<{ type: "jiti_error"; error: unknown }, unknown> =>
  TE.tryCatch(
    () => jiti.import(path),
    (error): { type: "jiti_error"; error: unknown } => ({
      type: "jiti_error",
      error,
    }),
  );
