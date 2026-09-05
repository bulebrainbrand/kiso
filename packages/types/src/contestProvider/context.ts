import type { StorageContext, StorageType } from "./storage.ts";
import type { FetchFn } from "./fetch.ts";

export type BaseContext<S extends StorageType> = {
  storage: StorageContext<S>;
  fetch: FetchFn;
};
