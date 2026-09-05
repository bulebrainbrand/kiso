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
import { errAsync, fromPromise, ResultAsync } from "neverthrow";
import { parse, type HTMLElement } from "node-html-parser";
import * as v from "valibot";

import {
  yukicoderContestSchema,
  type YukicoderContestProblem,
} from "./schema/contest.ts";
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
        fromPromise<unknown, UnexpectedError>(
          res.json(),
          (error): UnexpectedError => ({
            type: "unexpected_error",
            message: error,
          }),
        ),
      )
      .map((body) => v.safeParse(yukicoderContestSchema, body))
      .andThen((parsed): ResultAsync<Contest, ProviderError> => {
        if (!parsed.success) {
          return errAsync({
            type: "validation_error",
            issues: parsed.issues,
          } satisfies ValidationError);
        }
        // 番号未割当 (No: null) の問題は問題ページの URL を作れないため除外する
        const problems = parsed.output.Problems.filter(
          (prob): prob is YukicoderContestProblem & { No: number } =>
            prob.No !== null,
        );
        return ResultAsync.combine(
          problems.map((prob) => this.fetchTestcase(ctx, prob.No)),
        ).map(
          (allTestcases) =>
            ({
              id: contestId,
              probrems: problems.map((probrem, i) => ({
                id: String(probrem.ProblemId),
                name: String(probrem.No),
                testcases: allTestcases[i] ?? [],
              })),
            }) satisfies Contest,
        );
      });
  }
  private fetchTestcase(
    ctx: YukicoderCtx,
    problemNo: number,
  ): ResultAsync<TestCase[], ProviderError> {
    return ctx
      .fetch(`https://yukicoder.me/problems/no/${problemNo}`)
      .andThen((res) =>
        fromPromise(res.text(), (error): UnexpectedError => ({
          type: "unexpected_error",
          message: error,
        })),
      )
      .map((text) => this.extractTestCase(parse(text)));
  }
  private extractTestCase(html: HTMLElement): TestCase[] {
    const sampleElements = html.querySelectorAll(".sample");
    // div .sample
    //   h5 .underline
    //     span # test case file name
    //   div .paragraph
    //     button
    //     h6
    //     pre # input
    //     h6
    //     pre # output
    const testcases: TestCase[] = [];
    for (const [i, ele] of sampleElements.entries()) {
      const pres = ele.querySelectorAll("pre");
      const input = pres[0]?.textContent;
      const output = pres[1]?.textContent;
      if (input === undefined || output === undefined) continue;
      const name =
        ele.querySelector("span")?.textContent.trim()
        || `kiso_placeholder_${i}`;
      testcases.push({ name, input, output });
    }
    return testcases;
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
