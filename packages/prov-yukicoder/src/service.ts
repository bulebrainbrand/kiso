import path from "path";

import {
  TEST_CASE_DIR_NAME,
  type BaseContext,
  type Contest,
  type ContestProvider,
  type Probrem,
  type ProviderError,
  type TestCase,
  type UnexpectedError,
  type ValidationError,
} from "@kiso/types";
import { pipe } from "fp-ts/function";
import * as O from "fp-ts/Option";
import * as TE from "fp-ts/TaskEither";
import * as TO from "fp-ts/TaskOption";
import { parse, type HTMLElement } from "node-html-parser";
import * as v from "valibot";

import { sanitizeSegment, sanitizeTestCaseName } from "./sanitize.ts";
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
  private getTestCaseDirectory(contestDir: string): string {
    return path.join(contestDir, TEST_CASE_DIR_NAME);
  }
  getSingleProbremDirectory(
    ctx: BaseContext<{ API_KEY: string }>,
    _contest: Contest,
    probrem: Probrem,
  ): TE.TaskEither<ProviderError, string> {
    return TE.right(
      path.join(
        ctx.fs.providerDir.rootDir,
        "single_" + sanitizeSegment(probrem.id, "unknown"),
      ),
    );
  }
  createContestDirectory(
    ctx: BaseContext<{ API_KEY: string }>,
    contest: Contest,
  ): TE.TaskEither<ProviderError, string> {
    return pipe(
      this.getContestDirectory(ctx, contest),
      TE.chainW((dir) =>
        pipe(
          TE.fromEither(ctx.fs.providerDir.mkdir(dir)),
          TE.chainW(() =>
            pipe(
              contest.probrems.map((probrem) =>
                this.createProbremTestCase(ctx, dir, probrem),
              ),
              TE.sequenceArray,
            ),
          ),
          TE.map(() => dir),
        ),
      ),
    );
  }
  private createProbremTestCase(
    ctx: BaseContext<{ API_KEY: string }>,
    contestPath: string,
    probrem: Probrem,
  ): TE.TaskEither<ProviderError, void> {
    const testCaseDir = path.join(
      this.getTestCaseDirectory(contestPath),
      sanitizeSegment(probrem.id, "unknown"),
    );
    return this.writeTestCases(ctx, testCaseDir, probrem.testcases);
  }
  private writeTestCases(
    ctx: BaseContext<{ API_KEY: string }>,
    testCaseDir: string,
    testcases: Probrem["testcases"],
  ): TE.TaskEither<ProviderError, void> {
    return pipe(
      TE.fromEither(ctx.fs.providerDir.mkdir(testCaseDir)),
      TE.chainW(() =>
        pipe(
          testcases.flatMap((testcase, idx) => {
            const safeName = sanitizeSegment(
              testcase.name,
              `kiso_placeholder_${idx}`,
            );
            return [
              TE.fromEither(
                ctx.fs.providerDir.writeFile(
                  path.join(testCaseDir, `${safeName}_in.txt`),
                  testcase.input,
                ),
              ),
              TE.fromEither(
                ctx.fs.providerDir.writeFile(
                  path.join(testCaseDir, `${safeName}_out.txt`),
                  testcase.output,
                ),
              ),
            ];
          }),
          TE.sequenceArray,
        ),
      ),
      TE.map(() => {}),
    );
  }
  createSingleProbremDirectory(
    ctx: BaseContext<{ API_KEY: string }>,
    contest: Contest,
    probrem: Probrem,
  ): TE.TaskEither<ProviderError, string> {
    return pipe(
      this.getSingleProbremDirectory(ctx, contest, probrem),
      TE.chainW((dir) =>
        pipe(
          TE.fromEither(ctx.fs.providerDir.mkdir(dir)),
          TE.chainW(() =>
            this.writeTestCases(
              ctx,
              this.getTestCaseDirectory(dir),
              probrem.testcases,
            ),
          ),
          TE.map(() => dir),
        ),
      ),
    );
  }
  isTargetUrl(
    ctx: BaseContext<{ API_KEY: string }>,
    url: string,
  ): TE.TaskEither<ProviderError, boolean> {
    return TE.right(url.startsWith("https://yukicoder.me"));
  }
  isTargetId(
    ctx: BaseContext<{ API_KEY: string }>,
    id: string,
  ): TE.TaskEither<ProviderError, boolean> {
    return TE.right(/^\d+$/.test(id));
  }
  parseContestIdFromUrl(
    _ctx: BaseContext<{ API_KEY: string }>,
    url: string,
  ): TO.TaskOption<string> {
    return async () => {
      try {
        const parsed = new URL(url);
        if (parsed.hostname !== "yukicoder.me") return O.none;
        const match = /^\/contests\/(\d+)\/?$/.exec(parsed.pathname);
        if (!match?.[1]) return O.none;
        return O.some(match[1]);
      } catch {
        return O.none;
      }
    };
  }
  getContestDirectory(
    ctx: BaseContext<{ API_KEY: string }>,
    contest: Contest,
  ): TE.TaskEither<ProviderError, string> {
    return TE.right(
      path.join(
        ctx.fs.providerDir.rootDir,
        sanitizeSegment(contest.id, "unknown"),
      ),
    );
  }
  loginSchema = v.object({ API_KEY: v.string() });
  login(ctx: YukicoderCtx, credentials: YukicoderLoginOutput) {
    return TE.fromEither(ctx.storage.setItem("API_KEY", credentials.API_KEY));
  }
  fetchContest(
    ctx: YukicoderCtx,
    contestId: string,
  ): TE.TaskEither<ProviderError, Contest> {
    const safeContestId = sanitizeSegment(contestId, "unknown");
    return pipe(
      ctx.fetch(
        `https://yukicoder.me/api/v1/contest/id/${encodeURIComponent(safeContestId)}`,
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
                id: safeContestId,
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
    const usedNames = new Set<string>();
    for (const [i, ele] of sampleElements.entries()) {
      const pres = ele.querySelectorAll("pre");
      const input = pres[0]?.textContent;
      const output = pres[1]?.textContent;
      if (input === undefined || output === undefined) continue;
      const rawName = ele.querySelector("span")?.textContent ?? "";
      let name = sanitizeTestCaseName(rawName, i);
      if (usedNames.has(name)) {
        let n = 2;
        while (usedNames.has(`${name}_${n}`)) n++;
        name = `${name}_${n}`;
      }
      usedNames.add(name);
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
