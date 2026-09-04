import type { ResultAsync } from "neverthrow";
import type { JSONPrimitive, StorageType } from "./storage.ts";
import type { Contest } from "../contest.ts";
import type { BaseContext } from "./context.ts";
import type { LoginSchema } from "./login.ts";
type FetchError =
  | { type: "not_found"; url: string }
  | { type: "fetch_error"; status: number; error: string };
type UnexpectedError = { type: "unexpected_error"; message: string };

type AuthError = { type: "auth_error" };
export type ContestProvider<S extends StorageType, LA extends Record<string, JSONPrimitive>, LO> = {
  readonly name: string;
  fetchContest(
    ctx: BaseContext<S>,
    contestId: string,
  ): ResultAsync<Contest, FetchError | UnexpectedError | AuthError>;
  loginSchema: LoginSchema<LA, LO>;
  login(ctx: BaseContext<S>, credentials: LO): ResultAsync<void, UnexpectedError | AuthError>;
  whoami(ctx: BaseContext<S>): ResultAsync<string, AuthError | UnexpectedError>;
};
