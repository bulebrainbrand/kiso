import type { ContestProvider } from "@kiso/types";
import * as TE from "fp-ts/TaskEither";
export type ProviderAmbiguousError = {
  type: "provider_ambiguous";
  names: string[];
};
export const ensureSingleProvider = (
  providers: ContestProvider[],
): TE.TaskEither<ProviderAmbiguousError, ContestProvider> => {
  const first = providers[0];
  if (providers.length === 1 && first) return TE.right(first);
  return TE.left({
    type: "provider_ambiguous",
    names: providers.map((provider) => provider.name),
  });
};
