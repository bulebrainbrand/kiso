import type { ContestProvider } from "@kiso/types";
import * as TO from "fp-ts/TaskOption";

export const findProvidersByURL = (
  url: string,
  providers: ContestProvider[],
): TO.TaskOption<ContestProvider[]> => {
  const suggest = Promise.all(
    providers.map((provider) => provider.isTargetUrl()),
  );
};
