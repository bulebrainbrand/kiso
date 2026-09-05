import { type ResultAsync, fromPromise } from "neverthrow";

import { createConfigJiti } from "./createJiti.ts";

let jiti = createConfigJiti();
export const runConfig = (
  path: string,
): ResultAsync<unknown, { type: "jiti_error"; error: unknown }> =>
  fromPromise(jiti.import(path), (error) => ({
    type: "jiti_error",
    error,
  }));
