import * as TE from "fp-ts/TaskEither";

import type { Contest } from "../contest.ts";
import type { UnexpectedError } from "../contestProvider/storage.ts";
import type { ValidationError } from "../errors.ts";
import type {
  ContestProbremFileContext,
  Context,
  SingleProbremFileContext,
} from "./context.ts";

export type TestSuccess = {
  type: "success";
  id: string;
};

export type TestFailed = {
  type: "failed";
  id: string;
  expect: string;
  actual: string;
};

export type TestError = {
  type: "error";
  id: string;
  error: string;
};

export type TestResult = TestSuccess | TestFailed | TestError;

export type RunSuccess = {
  type: "success";
  output: string;
};

export type RunFailed = {
  type: "failed";
  error: string;
};

export type RunResult = RunSuccess | RunFailed;

export interface LanguagePlugin {
  createProbrem(
    ctx: Context,
    fileContext: ContestProbremFileContext,
  ): TE.TaskEither<{ log: string }, ValidationError | UnexpectedError>;

  createSingleProbrem(
    ctx: Context,
    fileContext: SingleProbremFileContext,
  ): TE.TaskEither<{ log: string }, ValidationError | UnexpectedError>;

  createContest(
    ctx: Context,
    contest: Contest,
    dir: string,
  ): TE.TaskEither<{ log: string }, ValidationError | UnexpectedError>;

  testContestFile(
    ctx: Context,
    fileContext: ContestProbremFileContext,
  ): TE.TaskEither<TestResult[], ValidationError | UnexpectedError>;

  runContestFile(
    ctx: Context,
    fileContext: ContestProbremFileContext,
    input: string,
  ): TE.TaskEither<RunResult, ValidationError | UnexpectedError>;
  testSingleProbremFile(
    ctx: Context,
    fileContext: SingleProbremFileContext,
  ): TE.TaskEither<TestResult[], ValidationError | UnexpectedError>;

  runSingleProbremFile(
    ctx: Context,
    fileContext: SingleProbremFileContext,
    input: string,
  ): TE.TaskEither<RunResult, ValidationError | UnexpectedError>;

  buildContestFile(
    ctx: Contest,
    fileContext: ContestProbremFileContext,
  ): TE.TaskEither<
    { fileName: string; content: string },
    ValidationError | UnexpectedError
  >;
  buildSingleProbremFile(
    ctx: Contest,
    fileContext: SingleProbremFileContext,
  ): TE.TaskEither<
    { fileName: string; content: string },
    ValidationError | UnexpectedError
  >;
}
