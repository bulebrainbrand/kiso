import { type ResultAsync, fromPromise } from "neverthrow";
import { createConfigJiti } from "./createJiti.ts";

let jiti = createConfigJiti();
export const runConfig = (path: string): ResultAsync<unknown, unknown> =>
  fromPromise(jiti.import(path), (error) => error);
