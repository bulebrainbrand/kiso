import type {
  JudgeOptions,
  RunFailure,
  TestResult,
  UnexpectedError,
  ValidationError,
} from "@kiso/types";
import * as E from "fp-ts/Either";
import { pipe } from "fp-ts/function";
import * as TE from "fp-ts/TaskEither";

import { compareOutputs } from "./compare.ts";
import { formatFailure } from "./failures.ts";
import type { BatchRunner } from "./runner.ts";

export type SolverInput = {
  name: string;
  input: string;
};

const judgePair = (
  { name, input: _input }: SolverInput,
  candidate: E.Either<RunFailure, string>,
  solver: E.Either<RunFailure, string>,
  options?: JudgeOptions,
): TestResult => {
  if (E.isLeft(candidate)) {
    return { type: "error", id: name, error: formatFailure(candidate.left) };
  }
  if (E.isLeft(solver)) {
    return {
      type: "error",
      id: name,
      error: `solver: ${formatFailure(solver.left)}`,
    };
  }
  return compareOutputs(solver.right, candidate.right, options?.compare)
    ? { type: "success", id: name }
    : {
        type: "failed",
        id: name,
        expect: solver.right,
        actual: candidate.right,
      };
};

export const judgeWithSolver = (
  inputs: readonly SolverInput[],
  candidate: BatchRunner,
  solver: BatchRunner,
  options?: JudgeOptions,
): TE.TaskEither<ValidationError | UnexpectedError, TestResult[]> =>
  pipe(
    TE.Do,
    TE.bind("candidateResults", () =>
      candidate(inputs.map(({ input }) => input)),
    ),
    TE.bind("solverResults", () => solver(inputs.map(({ input }) => input))),
    TE.chainEitherK(
      ({
        candidateResults,
        solverResults,
      }): E.Either<ValidationError | UnexpectedError, TestResult[]> =>
        candidateResults.length === inputs.length
        && solverResults.length === inputs.length
          ? E.right(
              inputs.map((input, index) =>
                judgePair(
                  input,
                  candidateResults[index] as E.Either<RunFailure, string>,
                  solverResults[index] as E.Either<RunFailure, string>,
                  options,
                ),
              ),
            )
          : E.left({
              type: "unexpected_error",
              message:
                `batch runner returned ${candidateResults.length}`
                + `/${solverResults.length} results`
                + ` for ${inputs.length} inputs`,
            }),
    ),
  );
