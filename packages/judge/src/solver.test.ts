import type { RunFailure, UnexpectedError, ValidationError } from "@kiso/types";
import * as E from "fp-ts/Either";
import * as TE from "fp-ts/TaskEither";
import { describe, expect, it } from "vite-plus/test";

import type { BatchRunner } from "./runner.ts";
import { judgeWithSolver } from "./solver.ts";

const ok = (output: string): E.Either<RunFailure, string> => E.right(output);
const runtimeError = (log: string): E.Either<RunFailure, string> =>
  E.left({ type: "runtime_error", log });

const stubRunner =
  (results: E.Either<RunFailure, string>[]): BatchRunner =>
  () =>
    TE.right(results);

const fatalRunner =
  (error: ValidationError | UnexpectedError): BatchRunner =>
  () =>
    TE.left(error);

const fatal: UnexpectedError = {
  type: "unexpected_error",
  message: "boom",
};

const inputs = [
  { name: "1", input: "1 2\n" },
  { name: "2", input: "3 4\n" },
];

describe("judgeWithSolver", () => {
  it("候補とsolverが一致すればsuccess", async () => {
    const result = await judgeWithSolver(
      inputs,
      stubRunner([ok("3"), ok("7")]),
      stubRunner([ok("3\n"), ok("7\n")]),
    )();

    expect(result).toStrictEqualRight([
      { type: "success", id: "1" },
      { type: "success", id: "2" },
    ]);
  });

  it("不一致はexpect=solver・actual=候補のfailedになる", async () => {
    const result = await judgeWithSolver(
      [{ name: "1", input: "1 2\n" }],
      stubRunner([ok("4")]),
      stubRunner([ok("3")]),
    )();

    expect(result).toStrictEqualRight([
      { type: "failed", id: "1", expect: "3", actual: "4" },
    ]);
  });

  it("候補の失敗はそのままerrorになる", async () => {
    const result = await judgeWithSolver(
      [{ name: "1", input: "x\n" }],
      stubRunner([runtimeError("candidate panic")]),
      stubRunner([ok("y")]),
    )();

    expect(result).toStrictEqualRight([
      {
        type: "error",
        id: "1",
        error: "runtime error:\ncandidate panic",
      },
    ]);
  });

  it("solverの失敗はsolver由来と分かるerrorになる", async () => {
    const result = await judgeWithSolver(
      [{ name: "1", input: "x\n" }],
      stubRunner([ok("y")]),
      stubRunner([runtimeError("solver panic")]),
    )();

    expect(result).toStrictEqualRight([
      {
        type: "error",
        id: "1",
        error: "solver: runtime error:\nsolver panic",
      },
    ]);
  });

  it("batch全体の致命的失敗はLeftで伝播する", async () => {
    const result = await judgeWithSolver(
      inputs,
      fatalRunner(fatal),
      stubRunner([ok("3"), ok("7")]),
    )();

    expect(result).toStrictEqualLeft(fatal);
  });

  it("件数が合わないbatchはunexpected_errorになる", async () => {
    const result = await judgeWithSolver(
      inputs,
      stubRunner([ok("3")]),
      stubRunner([ok("3"), ok("7")]),
    )();

    expect(result).toBeLeft();
  });
});
