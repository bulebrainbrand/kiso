import type {
  BaseContext,
  ContestProvider,
  ProviderError,
  StorageType,
} from "@kiso/types";
import { pipe } from "fp-ts/function";
import * as O from "fp-ts/Option";
import * as T from "fp-ts/Task";
import * as TE from "fp-ts/TaskEither";
import * as TO from "fp-ts/TaskOption";

import { createCtxFromProvider } from "../../ContestProvider/createCtxFromProvider.ts";

const findProviders =
  (
    providers: ContestProvider[],
    workspaceRoot: string,
    isTarget: (
      provider: ContestProvider,
      ctx: BaseContext<StorageType>,
    ) => TE.TaskEither<ProviderError, boolean>,
  ): TO.TaskOption<ContestProvider[]> =>
  async () => {
    const results = await Promise.all(
      providers.map((provider) =>
        pipe(
          isTarget(provider, createCtxFromProvider(provider, workspaceRoot)),
          // 判定に失敗したproviderは対象外として扱い、全体の推論は続行する
          TE.getOrElse(() => T.of(false)),
        )(),
      ),
    );
    const matched = providers.filter((_, i) => results[i] === true);
    return matched.length > 0 ? O.some(matched) : O.none;
  };

export const findProvidersByURL = (
  url: string,
  providers: ContestProvider[],
  workspaceRoot: string,
): TO.TaskOption<ContestProvider[]> =>
  findProviders(providers, workspaceRoot, (provider, ctx) =>
    provider.isTargetUrl(ctx, url),
  );

export const findProvidersById = (
  id: string,
  providers: ContestProvider[],
  workspaceRoot: string,
): TO.TaskOption<ContestProvider[]> =>
  findProviders(providers, workspaceRoot, (provider, ctx) =>
    provider.isTargetId(ctx, id),
  );
