import type { FetchFn } from "./fetch.ts";
import type { StorageContext, StorageType } from "./storage.ts";

export type BaseContext<S extends StorageType> = {
  storage: StorageContext<S>;
  fetch: FetchFn;
};
