import type { Contest, ContestProvider, ProviderError } from "@kiso/types";
import { pipe } from "fp-ts/function";
import * as TE from "fp-ts/TaskEither";

import { readConfig, type ReadConfigError } from "../../config/index.ts";
import { createCtxFromProvider } from "../../ContestProvider/createCtxFromProvider.ts";
import { resolveLanguagePlugin } from "../../languageResolver.ts";
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
  langFlags?: string[];
  langSetFlags?: string[];
  provider?: string;
};
export type NewContestData = {
  provider: ContestProvider;
  contest: Contest;
  contestId: string;
};

export const executeNewCommand = (
  {
    id,
    provider: providerName,
    langFlags = [],
    langSetFlags = [],
  }: NewCommandInput,
  cwd: string,
): TE.TaskEither<NewCommandError, void> =>
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
        TE.chainW(({ contest, contestId, provider }) => {
          const ctx = createCtxFromProvider(provider, workspaceRoot);
          return provider.createContestDirectory(ctx, contest);
        }),
        TE.map(() => {
          return resolveLanguagePlugin(langFlags, langSetFlags, config);
        }),
      ),
    ),
    TE.map((...arg: unknown[]) => {}),
  );
