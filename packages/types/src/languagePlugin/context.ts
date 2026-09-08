import type { Probrem } from "../contest.ts";
import type { FsContext } from "../fs.ts";

export interface Context {
  fs: FsContext;
}

export type FileContext = ContestProbremFileContext | SingleProbremFileContext;
export type ContestProbremFileContext = {
  type: "contest";
  probrems: Probrem[];
  targetProbrem: Probrem;
  contestDir: string;
  probremDir: string;
};

export type SingleProbremFileContext = {
  type: "single_probrem";
  probrem: Probrem;
  probremDir: string;
};
