import {
  type BaseContext,
  type Contest,
  type ContestProvider,
  type ProviderError,
  type TestCase,
  type UnexpectedError,
  type ValidationError,
} from "@kiso/types";
import { pipe } from "fp-ts/function";
import * as TE from "fp-ts/TaskEither";
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
  isTargetUrl(
    ctx: BaseContext<{ API_KEY: string }>,
    url: string,
  ): TE.TaskEither<ProviderError, boolean> {
    return TE.right(url.startsWith("https://yukicoder.me"));
  }
  getContestDirectory(
    ctx: BaseContext<{ API_KEY: string }>,
    contest: Contest,
  ): TE.TaskEither<ProviderError, string> {
    return TE.right(`./${contest.id}`);
  }
  loginSchema = v.object({ API_KEY: v.string() });
  login(ctx: YukicoderCtx, credentials: YukicoderLoginOutput) {
    return TE.fromEither(ctx.storage.setItem("API_KEY", credentials.API_KEY));
  }
  fetchContest(
    ctx: YukicoderCtx,
    contestId: string,
  ): TE.TaskEither<ProviderError, Contest> {
    return pipe(
      ctx.fetch(
        `https://yukicoder.me/api/v1/contest/id/${contestId}`,
        undefined,
        {
          maxRetries: 3,
          timeoutMs: 1500,
          backoff: "exponential",
        },
      ),
      TE.chainW((res) =>
        TE.tryCatch<UnexpectedError, unknown>(
          () => res.json(),
          (error): UnexpectedError => ({
            type: "unexpected_error",
            message: error,
          }),
        ),
      ),
      TE.map((body) => v.safeParse(yukicoderContestSchema, body)),
      TE.chainW((parsed): TE.TaskEither<ProviderError, Contest> => {
        if (!parsed.success) {
          return TE.left({
            type: "validation_error",
            issues: parsed.issues,
          } satisfies ValidationError);
        }
        // 番号未割当 (No: null) の問題は問題ページの URL を作れないため除外する
        const problems = parsed.output.Problems.filter(
          (prob): prob is YukicoderContestProblem & { No: number } =>
            prob.No !== null,
        );
        return pipe(
          problems.map((prob) => this.fetchTestcase(ctx, prob.No)),
          TE.sequenceArray,
          TE.map(
            (allTestcases) =>
              ({
                id: contestId,
                probrems: problems.map((probrem, i) => ({
                  id: String(probrem.ProblemId),
                  name: String(probrem.No),
                  testcases: allTestcases[i] ?? [],
                })),
              }) satisfies Contest,
          ),
        );
      }),
    );
  }
  private fetchTestcase(
    ctx: YukicoderCtx,
    problemNo: number,
  ): TE.TaskEither<ProviderError, TestCase[]> {
    return pipe(
      ctx.fetch(`https://yukicoder.me/problems/no/${problemNo}`, undefined, {
        maxRetries: 3,
        timeoutMs: 1500,
        backoff: "exponential",
      }),
      TE.chainW((res) =>
        TE.tryCatch<UnexpectedError, string>(
          () => res.text(),
          (error): UnexpectedError => ({
            type: "unexpected_error",
            message: error,
          }),
        ),
      ),
      TE.map((text) => this.extractTestCase(parse(text))),
    );
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
    return pipe(
      ctx.storage.getItem("API_KEY"),
      TE.fromEither,
      TE.map((token) =>
        token
          ? `api token: ${
              token.length <= 5
                ? "*".repeat(token.length)
                : token.slice(0, 5) + "*".repeat(token.length - 5)
            }`
          : "no api token",
      ),
    );
  }
}
