import type * as TE from "fp-ts/TaskEither";

import type { UnexpectedError } from "../contestProvider/storage.ts";
import type { ValidationError } from "../errors.ts";

export type InteractorRef = {
  plugin: string;
  path: string;
  args?: string[];
};

export type SessionResult =
  | { verdict: "AC" }
  | {
      verdict: "WA" | "RE" | "TLE";
      message: string;
      transcript?: string;
    };

export type SessionFailure =
  | { type: "session_error"; log: string }
  | ValidationError
  | UnexpectedError;

export type InteractorTurnFailure =
  | { type: "interactor_error"; log: string }
  | ValidationError
  | UnexpectedError;

export type InteractorTurnResult =
  | { kind: "query"; text: string }
  | { kind: "verdict"; verdict: SessionResult };

export interface InteractorSession {
  next(
    solutionOutput: string | null,
  ): TE.TaskEither<InteractorTurnFailure, InteractorTurnResult>;
}

export type InteractorFailure =
  | { type: "interactor_not_found"; path: string }
  | { type: "interactor_error"; log: string }
  | ValidationError
  | UnexpectedError;

export type InteractorFactory = (
  interactorFile: string,
  seed: string,
) => TE.TaskEither<InteractorFailure, InteractorSession>;
