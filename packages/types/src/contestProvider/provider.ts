import type * as TE from "fp-ts/TaskEither";
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
  ): TE.TaskEither<ProviderError, Contest>;
  loginSchema: LoginSchema<LA, LO>;
  login(
    ctx: BaseContext<S>,
    credentials: LO,
  ): TE.TaskEither<ProviderError, void>;
  whoami(ctx: BaseContext<S>): TE.TaskEither<ProviderError, string>;
  isTargetUrl(
    ctx: BaseContext<S>,
    url: string,
  ): TE.TaskEither<ProviderError, boolean>;
  getContestDirectory(
    ctx: BaseContext<S>,
    contest: Contest,
  ): TE.TaskEither<ProviderError, string>;
}
