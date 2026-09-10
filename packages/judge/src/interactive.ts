import type { SessionFailure, SessionResult, TestResult } from "@kiso/types";
import * as E from "fp-ts/Either";

import { formatFailure } from "./failures.ts";

export type InteractiveSession = {
  seed: string;
  result: E.Either<SessionFailure, SessionResult>;
};

const withTranscript = (message: string, transcript?: string): string =>
  transcript === undefined ? message : `${message}\n${transcript}`;

const judgeSession = ({ seed, result }: InteractiveSession): TestResult => {
  if (E.isLeft(result)) {
    return {
      type: "error",
      id: seed,
      error: formatFailure(result.left),
    };
  }
  const session = result.right;
  switch (session.verdict) {
    case "AC":
      return { type: "success", id: seed };
    case "WA":
      return {
        type: "failed",
        id: seed,
        expect: "AC",
        actual: withTranscript(`WA: ${session.message}`, session.transcript),
      };
    case "RE":
    case "TLE":
      return {
        type: "error",
        id: seed,
        error: `[${session.verdict}] ${withTranscript(
          session.message,
          session.transcript,
        )}`,
      };
  }
};

export const judgeInteractive = (
  sessions: readonly InteractiveSession[],
): TestResult[] => sessions.map(judgeSession);
