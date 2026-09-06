import type { ResultAsync } from "neverthrow";
import type * as v from "valibot";

import type { Contest } from "../contest.ts";
import type { BaseContext } from "./context.ts";
import type { FetchError } from "./fetch.ts";
import type { LoginSchema } from "./login.ts";
import type { JSONPrimitive, StorageError, StorageType } from "./storage.ts";

export type AuthError = { type: "auth_error"; reason: "invalid_credentials" };

export type ValidationError = {
  type: "validation_error";
  issues: v.GenericIssue[];
};

export type ProviderError =
  | StorageError
  | FetchError
  | AuthError
  | ValidationError;
export interface ContestProvider<
  S extends StorageType,
  LA extends Record<string, JSONPrimitive>,
  LO = LA,
> {
  readonly name: string;
  fetchContest(
    ctx: BaseContext<S>,
    contestId: string,
  ): ResultAsync<Contest, ProviderError>;
  loginSchema: LoginSchema<LA, LO>;
  login(ctx: BaseContext<S>, credentials: LO): ResultAsync<void, ProviderError>;
  whoami(ctx: BaseContext<S>): ResultAsync<string, ProviderError>;
  isTargetUrl(
    ctx: BaseContext<S>,
    url: string,
  ): ResultAsync<boolean, ProviderError>;
  getContestDirectory(
    ctx: BaseContext<S>,
    contest: Contest,
  ): ResultAsync<string, ProviderError>;
}
