import type { BaseContext, ContestProvider, StorageType } from "@kiso/types";

import { createCtx } from "./createCtx.ts";

export const createCtxFromProvider = (
  provider: ContestProvider,
  workspaceRoot: string,
): BaseContext<StorageType> => {
  return createCtx(provider.name, workspaceRoot);
};
