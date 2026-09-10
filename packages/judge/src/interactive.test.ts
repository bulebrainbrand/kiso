import type { SessionResult } from "@kiso/types";
import * as E from "fp-ts/Either";
import { describe, expect, it } from "vite-plus/test";

import { judgeInteractive } from "./interactive.ts";
import type { InteractiveSession } from "./interactive.ts";

const ac = (seed: string): InteractiveSession => ({
  seed,
  result: E.right({ verdict: "AC" }),
});

const verdict = (seed: string, result: SessionResult): InteractiveSession => ({
  seed,
  result: E.right(result),
});

const broken = (seed: string, log: string): InteractiveSession => ({
  seed,
  result: E.left({ type: "session_error", log }),
});

it("予期せぬ失敗もerrorに写像される", () => {
  const sessions: InteractiveSession[] = [
    {
      seed: "1",
      result: E.left({ type: "unexpected_error", message: "boom" }),
    },
  ];

  expect(judgeInteractive(sessions)).toStrictEqual([
    { type: "error", id: "1", error: "unexpected error: boom" },
  ]);
});

describe("judgeInteractive", () => {
  it("ACはsuccessになる", () => {
    expect(judgeInteractive([ac("1"), ac("2")])).toStrictEqual([
      { type: "success", id: "1" },
      { type: "success", id: "2" },
    ]);
  });

  it("WAはfailedになりmessageを持つ", () => {
    expect(
      judgeInteractive([
        verdict("1", { verdict: "WA", message: "wrong answer on query 3" }),
      ]),
    ).toStrictEqual([
      {
        type: "failed",
        id: "1",
        expect: "AC",
        actual: "WA: wrong answer on query 3",
      },
    ]);
  });

  it("WAのtranscriptはactualに付く", () => {
    expect(
      judgeInteractive([
        verdict("1", {
          verdict: "WA",
          message: "wrong answer",
          transcript: "> 1 2\n< 3",
        }),
      ]),
    ).toStrictEqual([
      {
        type: "failed",
        id: "1",
        expect: "AC",
        actual: "WA: wrong answer\n> 1 2\n< 3",
      },
    ]);
  });

  it("RE/TLEはverdict付きのerrorになる", () => {
    expect(
      judgeInteractive([
        verdict("1", { verdict: "RE", message: "crashed" }),
        verdict("2", { verdict: "TLE", message: "timed out" }),
      ]),
    ).toStrictEqual([
      { type: "error", id: "1", error: "[RE] crashed" },
      { type: "error", id: "2", error: "[TLE] timed out" },
    ]);
  });

  it("session自体の失敗はerrorになり他セッションを止めない", () => {
    expect(
      judgeInteractive([ac("1"), broken("2", "pipe closed")]),
    ).toStrictEqual([
      { type: "success", id: "1" },
      { type: "error", id: "2", error: "session error:\npipe closed" },
    ]);
  });

  it("空セッションは空配列を返す", () => {
    expect(judgeInteractive([])).toStrictEqual([]);
  });
});
