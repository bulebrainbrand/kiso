import type { ResultAsync } from "neverthrow";
import type { StorageContext, StorageType } from "./storage.ts";

export type BaseContext<S extends StorageType> = {
  storage: StorageContext<S>;
  fetch(
    input: string | URL | Request,
    init?: RequestInit,
    retry?: number,
  ): ResultAsync<Response, unknown>;
};
