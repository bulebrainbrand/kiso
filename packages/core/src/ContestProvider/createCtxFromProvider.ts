import type { BaseContext, ContestProvider, StorageType } from "@kiso/types";

import { createCtx } from "./createCtx.ts";

export const createCtxFromProvider = (
  provider: ContestProvider,
): BaseContext<StorageType> => {
  return createCtx(provider.name, provider.name);
};
