import path from "node:path";

import type { BaseContext, StorageType } from "@kiso/types";

import { kisoFetch } from "./fetch/index.ts";
import { KisoFs } from "./fs.ts";
import { Storage } from "./storage.ts";

export const createCtx = (
  name: string,
  dir: string,
): BaseContext<StorageType> => {
  const workspaceRoot = path.resolve(dir);
  const fs = {
    providerDir: new KisoFs(path.join(workspaceRoot, name)),
    workspaceDir: new KisoFs(workspaceRoot),
  };
  const fetch = kisoFetch;
  const storage = new Storage(name, dir);
  return { fetch, fs, storage };
};
