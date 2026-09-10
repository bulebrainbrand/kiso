import type {
  JudgeOptions,
  RunFailure,
  TestCase,
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

const judgeOne = (
  testcase: TestCase,
  result: E.Either<RunFailure, string>,
  options?: JudgeOptions,
): TestResult =>
  pipe(
    result,
    E.match(
      (failure): TestResult => ({
        type: "error",
        id: testcase.name,
        error: formatFailure(failure),
      }),
      (output): TestResult =>
        compareOutputs(testcase.output, output, options?.compare)
          ? { type: "success", id: testcase.name }
          : {
              type: "failed",
              id: testcase.name,
              expect: testcase.output,
              actual: output,
            },
    ),
  );

export const judgeTestcases = (
  testcases: readonly TestCase[],
  run: BatchRunner,
  options?: JudgeOptions,
): TE.TaskEither<ValidationError | UnexpectedError, TestResult[]> =>
  pipe(
    run(testcases.map(({ input }) => input)),
    TE.chainEitherK(
      (results): E.Either<ValidationError | UnexpectedError, TestResult[]> =>
        results.length === testcases.length
          ? E.right(
              testcases.map((testcase, index) =>
                judgeOne(
                  testcase,
                  results[index] as E.Either<RunFailure, string>,
                  options,
                ),
              ),
            )
          : E.left({
              type: "unexpected_error",
              message:
                `batch runner returned ${results.length} results`
                + ` for ${testcases.length} testcases`,
            }),
    ),
  );
