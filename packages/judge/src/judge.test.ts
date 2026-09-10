import type { RunFailure, UnexpectedError, ValidationError } from "@kiso/types";
import * as E from "fp-ts/Either";
import * as TE from "fp-ts/TaskEither";
import { describe, expect, it } from "vite-plus/test";

import { judgeTestcases } from "./judge.ts";
import type { BatchRunner } from "./runner.ts";

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

describe("judgeTestcases", () => {
  it("全一致ならsuccess列を返す", async () => {
    const result = await judgeTestcases(
      [
        { name: "1", input: "1 2\n", output: "3\n" },
        { name: "2", input: "3 4\n", output: "7\n" },
      ],
      stubRunner([ok("3\n"), ok("7")]),
    )();

    expect(result).toStrictEqualRight([
      { type: "success", id: "1" },
      { type: "success", id: "2" },
    ]);
  });

  it("不一致はexpect/actualを保持したfailedになる", async () => {
    const result = await judgeTestcases(
      [{ name: "1", input: "1 2\n", output: "3\n" }],
      stubRunner([ok("4\n")]),
    )();

    expect(result).toStrictEqualRight([
      { type: "failed", id: "1", expect: "3\n", actual: "4\n" },
    ]);
  });

  it("実行失敗はerrorになり他ケースの判定を止めない", async () => {
    const result = await judgeTestcases(
      [
        { name: "1", input: "1 2\n", output: "3\n" },
        { name: "2", input: "x\n", output: "y\n" },
      ],
      stubRunner([ok("3\n"), runtimeError("panic!")]),
    )();

    expect(result).toStrictEqualRight([
      { type: "success", id: "1" },
      { type: "error", id: "2", error: "runtime error:\npanic!" },
    ]);
  });

  it("batch全体の致命的失敗はLeftで伝播する", async () => {
    const result = await judgeTestcases(
      [{ name: "1", input: "1 2\n", output: "3\n" }],
      fatalRunner(fatal),
    )();

    expect(result).toStrictEqualLeft(fatal);
  });

  it("空ケースは空配列を返す", async () => {
    const result = await judgeTestcases([], stubRunner([]))();

    expect(result).toStrictEqualRight([]);
  });

  it("件数が合わないbatchはunexpected_errorになる", async () => {
    const result = await judgeTestcases(
      [
        { name: "1", input: "1 2\n", output: "3\n" },
        { name: "2", input: "3 4\n", output: "7\n" },
      ],
      stubRunner([ok("3\n")]),
    )();

    expect(result).toBeLeft();
  });
});
