import path from "node:path";

import type { BaseContext, StorageType } from "@kiso/types";

import { kisoFetch } from "./fetch/index.ts";
import { KisoFs } from "./fs.ts";
import { Storage } from "./storage.ts";

export const createCtx = (
  name: string,
  workspaceRoot: string,
): BaseContext<StorageType> => {
  const root = path.resolve(workspaceRoot);
  const fs = {
    providerDir: new KisoFs(path.join(root, name)),
    workspaceDir: new KisoFs(root),
  };
  const fetch = kisoFetch;
  const storage = new Storage(name, root);
  return { fetch, fs, storage };
};
