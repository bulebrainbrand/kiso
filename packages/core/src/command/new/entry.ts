import type { Contest, ContestProvider, ProviderError } from "@kiso/types";
import { pipe } from "fp-ts/function";
import * as TE from "fp-ts/TaskEither";

import { readConfig, type ReadConfigError } from "../../config/index.ts";
import {
  ensureSingleProvider,
  type ProviderAmbiguousError,
} from "./ensureSingleProvider.ts";
import { fetchNewContest } from "./fetchNewContest.ts";
import {
  resolveContestId,
  type ContestIdParseError,
} from "./resolveContestId.ts";
import {
  resolveProviders,
  type ProviderNotFoundError,
  type ProviderNotHitError,
} from "./resolveProviders.ts";
export type { ProviderAmbiguousError } from "./ensureSingleProvider.ts";
export type { ContestIdParseError } from "./resolveContestId.ts";
export type {
  ProviderNotFoundError,
  ProviderNotHitError,
} from "./resolveProviders.ts";
export type NewCommandError =
  | ReadConfigError
  | ProviderNotFoundError
  | ProviderNotHitError
  | ProviderAmbiguousError
  | ContestIdParseError
  | ProviderError;
export type NewCommandInput = {
  id: string;
  languages?: string[];
  provider?: string;
};
export type NewCommandSuccess = {
  provider: ContestProvider;
  contest: Contest;
  contestId: string;
};

export const executeNewCommand = (
  { id, provider: providerName }: NewCommandInput,
  cwd: string,
): TE.TaskEither<NewCommandError, NewCommandSuccess> =>
  pipe(
    readConfig(cwd),
    TE.chainW(({ config, workspaceRoot }) =>
      pipe(
        resolveProviders(config, id, providerName, workspaceRoot),
        TE.chainW(ensureSingleProvider),
        TE.chainW((provider) =>
          pipe(
            resolveContestId(provider, id, workspaceRoot),
            TE.chainW((contestId) =>
              fetchNewContest(provider, contestId, workspaceRoot),
            ),
          ),
        ),
      ),
    ),
  );
