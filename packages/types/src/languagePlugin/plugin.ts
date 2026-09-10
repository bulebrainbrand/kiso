import type * as E from "fp-ts/Either";
import * as TE from "fp-ts/TaskEither";

import type { Contest } from "../contest.ts";
import type { UnexpectedError } from "../contestProvider/storage.ts";
import type { ValidationError } from "../errors.ts";
import type {
  ContestProbremFileContext,
  Context,
  SingleProbremFileContext,
} from "./context.ts";
import type {
  GenerateFailure,
  GeneratedInput,
  GeneratedTestCase,
  GeneratorOptions,
} from "./generate.ts";
import type {
  InteractorFactory,
  InteractorFailure,
  InteractorSession,
  SessionFailure,
  SessionResult,
} from "./interactive.ts";
import type { RunFailure } from "./run.ts";

export interface LanguagePlugin {
  createProbrem(
    ctx: Context,
    fileContext: ContestProbremFileContext,
  ): TE.TaskEither<ValidationError | UnexpectedError, { log: string }>;

  createSingleProbrem(
    ctx: Context,
    fileContext: SingleProbremFileContext,
  ): TE.TaskEither<ValidationError | UnexpectedError, { log: string }>;

  createContest(
    ctx: Context,
    contest: Contest,
    dir: string,
  ): TE.TaskEither<ValidationError | UnexpectedError, { log: string }>;

  runContestFiles(
    ctx: Context,
    fileContext: ContestProbremFileContext,
    inputs: readonly string[],
  ): TE.TaskEither<
    ValidationError | UnexpectedError,
    E.Either<RunFailure, string>[]
  >;

  runSingleProbremFiles(
    ctx: Context,
    fileContext: SingleProbremFileContext,
    inputs: readonly string[],
  ): TE.TaskEither<
    ValidationError | UnexpectedError,
    E.Either<RunFailure, string>[]
  >;

  generateTestCases(
    ctx: Context,
    generatorFile: string,
    options?: GeneratorOptions,
  ): TE.TaskEither<GenerateFailure, GeneratedTestCase[]>;

  generateInputs(
    ctx: Context,
    generatorFile: string,
    options?: GeneratorOptions,
  ): TE.TaskEither<GenerateFailure, GeneratedInput[]>;

  runInteractiveSessions(
    ctx: Context,
    fileContext: ContestProbremFileContext,
    createInteractor: InteractorFactory,
    seeds: readonly string[],
  ): TE.TaskEither<
    ValidationError | UnexpectedError,
    E.Either<SessionFailure, SessionResult>[]
  >;

  runSingleProbremInteractiveSessions(
    ctx: Context,
    fileContext: SingleProbremFileContext,
    createInteractor: InteractorFactory,
    seeds: readonly string[],
  ): TE.TaskEither<
    ValidationError | UnexpectedError,
    E.Either<SessionFailure, SessionResult>[]
  >;

  createInteractorSession(
    ctx: Context,
    interactorFile: string,
    seed: string,
  ): TE.TaskEither<InteractorFailure, InteractorSession>;

  buildContestFile(
    ctx: Contest,
    fileContext: ContestProbremFileContext,
  ): TE.TaskEither<
    ValidationError | UnexpectedError,
    { fileName: string; content: string }
  >;
  buildSingleProbremFile(
    ctx: Contest,
    fileContext: SingleProbremFileContext,
  ): TE.TaskEither<
    ValidationError | UnexpectedError,
    { fileName: string; content: string }
  >;
}
