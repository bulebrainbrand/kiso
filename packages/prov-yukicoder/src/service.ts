import {
  toAsync,
  type BaseContext,
  type Contest,
  type ContestProvider,
  type ProviderError,
  type TestCase,
  type UnexpectedError,
  type ValidationError,
} from "@kiso/types";
import { Err, fromSafePromise, Ok, Result, ResultAsync } from "neverthrow";
import * as v from "valibot";

import { yukicoderContestSchema } from "./schema/contest.ts";
type YukicoderStorage = { API_KEY: string };
type YukicoderCtx = BaseContext<YukicoderStorage>;
const loginSchema = v.object({ API_KEY: v.string() });
type YukicoderLoginOutput = v.InferOutput<typeof loginSchema>;
export class YukiCoderService implements ContestProvider<
  { API_KEY: string },
  { API_KEY: string }
> {
  constructor(readonly name: string) {}
  loginSchema = v.object({ API_KEY: v.string() });
  login(ctx: YukicoderCtx, credentials: YukicoderLoginOutput) {
    return toAsync(ctx.storage.setItem("API_KEY", credentials.API_KEY));
  }
  fetchContest(
    ctx: YukicoderCtx,
    contestId: string,
  ): ResultAsync<Contest, ProviderError> {
    return ctx
      .fetch(`https://yukicoder.me/api/v1/contest/id/${contestId}`, undefined, {
        maxRetries: 3,
        timeoutMs: 1500,
        backoff: "exponential",
      })
      .andThen((res) =>
        fromSafePromise<unknown, UnexpectedError>(
          res.json().catch((error) => {
            throw {
              type: "unexpected_error",
              message: error,
            } satisfies UnexpectedError;
          }),
        ),
      )
      .map((body) => v.safeParse(yukicoderContestSchema, body))
      .andThen((result): Result<Contest, ValidationError> => {
        if (result.success) {
          const output = result.output;
          return new Ok({
            id: contestId,
            probrems: output.Problems.map((probrem) => ({
              id: String(probrem.ProblemId),
              name: String(probrem.No),
              testcases: this.fetchTestcase(ctx, probrem.ProblemId),
            })),
          } satisfies Contest);
        }
        return new Err({
          type: "validation_error",
          issues: result.issues,
        } satisfies ValidationError);
      });
  }
  private fetchTestcase(ctx: YukicoderCtx, probremId: number): TestCase[] {
    throw "";
  }
  whoami(ctx: YukicoderCtx) {
    return toAsync(
      ctx.storage
        .getItem("API_KEY")
        .map((token) =>
          token
            ? `api token: ${token.slice(0, 5) + "*".repeat(token.length - 5)}`
            : "no api token",
        ),
    );
  }
}
