import type { StorageContext, StorageType } from "./storage.ts";

export type BaseContext<S extends StorageType> = {
  storage: StorageContext<S>;
};
