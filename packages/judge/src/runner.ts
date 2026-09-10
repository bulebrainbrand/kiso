import type { RunFailure, UnexpectedError, ValidationError } from "@kiso/types";
import type * as E from "fp-ts/Either";
import type * as TE from "fp-ts/TaskEither";

export type BatchRunner = (
  inputs: readonly string[],
) => TE.TaskEither<
  ValidationError | UnexpectedError,
  E.Either<RunFailure, string>[]
>;
