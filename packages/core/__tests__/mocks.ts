/* v8 ignore start */
import type { Contest, ContestProvider, ProviderError } from "@kiso/types";
import * as O from "fp-ts/Option";
import * as TE from "fp-ts/TaskEither";

import type { Config } from "../src/config/configSchema.ts";

export const toTargetResult = (
  value: boolean | "error",
): TE.TaskEither<ProviderError, boolean> =>
  value === "error"
    ? TE.left({ type: "auth_error", reason: "invalid_credentials" })
    : TE.right(value);

export type MockProviderOptions = {
  isTargetUrl?: boolean | "error";
  isTargetId?: boolean | "error";
  parseId?: string | null;
  contest?: Contest | "fetch_error";
};

export const mockProvider = (
  name: string,
  options: MockProviderOptions = {},
): ContestProvider => {
  const {
    isTargetUrl = false,
    isTargetId = false,
    parseId = null,
    contest = { id: "1", probrems: [] },
  } = options;
  return {
    name,
    fetchContest: (_ctx, contestId) =>
      contest === "fetch_error"
        ? TE.left({ type: "not_found", url: contestId })
        : TE.right(
            contest.id === "1" && contestId !== "1"
              ? { ...contest, id: contestId }
              : contest,
          ),
    loginSchema: {} as ContestProvider["loginSchema"],
    login: () => TE.right(undefined),
    whoami: () => TE.right(name),
    isTargetUrl: () => toTargetResult(isTargetUrl),
    isTargetId: () => toTargetResult(isTargetId),
    parseContestIdFromUrl: () => async () =>
      parseId === null ? O.none : O.some(parseId),
    getContestDirectory: () => TE.right(`./${name}`),
  };
};

export const mockConfig = (providers: ContestProvider[]): Config =>
  ({
    provider: providers,
    lang: {
      plugins: [],
      default: {
        langs: [],
        extendWhenUseLangFlag: false,
        extendWhenUseLangSetFlag: false,
      },
      langSet: [],
    },
  }) as Config;
/* v8 ignore end */
