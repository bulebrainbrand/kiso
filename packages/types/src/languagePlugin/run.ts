import type { UnexpectedError } from "../contestProvider/storage.ts";
import type { ValidationError } from "../errors.ts";

export type RunFailure =
  | { type: "compile_error"; log: string }
  | { type: "runtime_error"; log: string }
  | ValidationError
  | UnexpectedError;
