import type { BaseContext, StorageType } from "@kiso/types";

import { kisoFetch } from "./fetch/index.ts";
import { kisoFs } from "./fs.ts";
import { Storage } from "./storage.ts";

export const createCtx = (
  name: string,
  dir: string,
): BaseContext<StorageType> => {
  const fs = kisoFs;
  const fetch = kisoFetch;
  const storage = new Storage(name, dir);
  return { fetch, fs, storage };
};
