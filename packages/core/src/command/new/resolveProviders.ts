import type { ContestProvider } from "@kiso/types";
import * as TE from "fp-ts/TaskEither";

import type { Config } from "../../config/configSchema.ts";
import { findProvidersById, findProvidersByURL } from "./findProviders.ts";
import { isURL } from "./isUrl.ts";
export type ProviderNotFoundError = {
  type: "provider_not_found";
  name: string;
};
export type ProviderNotHitError = { type: "provider_not_hit" };
export const resolveProviders = (
  config: Config,
  id: string,
  providerName: string | undefined,
  workspaceRoot: string,
): TE.TaskEither<
  ProviderNotFoundError | ProviderNotHitError,
  ContestProvider[]
> =>
  providerName
    ? findProvidersByName(providerName, config)
    : findProvidersByInput(id, config, workspaceRoot);
const findProvidersByName = (
  providerName: string,
  config: Config,
): TE.TaskEither<ProviderNotFoundError, ContestProvider[]> => {
  const result = config.provider.find((prov) => prov.name === providerName);
  if (result) return TE.right([result]);
  return TE.left({ type: "provider_not_found", name: providerName });
};
const findProvidersByInput = (
  id: string,
  config: Config,
  workspaceRoot: string,
): TE.TaskEither<ProviderNotHitError, ContestProvider[]> => {
  const providers = config.provider;
  const option = isURL(id)
    ? findProvidersByURL(id, providers, workspaceRoot)
    : findProvidersById(id, providers, workspaceRoot);
  return TE.fromTaskOption(
    () => ({ type: "provider_not_hit" }) satisfies ProviderNotHitError,
  )(option);
};
