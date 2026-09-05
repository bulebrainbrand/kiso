import type { BaseContext, Contest } from "@kiso/types";
import type { FetchError } from "@kiso/types";
import { errAsync, okAsync, type ResultAsync } from "neverthrow";
import { describe, expect, it } from "vite-plus/test";

import { YukiCoderService } from "./service.ts";

type YukicoderStorage = { API_KEY: string };
type YukicoderCtx = BaseContext<YukicoderStorage>;

const contestJson = {
  Id: 1,
  Name: "test contest",
  Date: "2024-01-01T12:00:00+09:00",
  EndDate: "2024-01-01T14:00:00+09:00",
  ProblemIdList: [101, 102],
  Problems: [
    { ProblemId: 101, No: 1, Title: "A" },
    { ProblemId: 102, No: 2, Title: "B" },
  ],
};

const problemHtml = (samples: [string, string, string][]) =>
  `<html><body>${samples
    .map(
      ([name, input, output]) =>
        `<div class="sample"><h5 class="underline"><span>${name}</span></h5>`
        + `<div class="paragraph"><h6>入力</h6><pre>${input}</pre>`
        + `<h6>出力</h6><pre>${output}</pre></div></div>`,
    )
    .join("")}</body></html>`;

const makeCtx = (
  handler: (url: string) => ResultAsync<Response, FetchError>,
): YukicoderCtx =>
  ({
    fetch: ((input: string | URL | Request) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : input.url;
      return handler(url);
    }) as YukicoderCtx["fetch"],
    storage: {} as YukicoderCtx["storage"],
    fs: {} as YukicoderCtx["fs"],
  }) as YukicoderCtx;

const okJson = (body: unknown) =>
  okAsync<Response, FetchError>(
    new Response(JSON.stringify(body), {
      headers: { "content-type": "application/json" },
    }),
  );

const okHtml = (html: string) =>
  okAsync<Response, FetchError>(
    new Response(html, { headers: { "content-type": "text/html" } }),
  );

describe("YukiCoderService.fetchContest", () => {
  it("コンテストと各問題のテストケースを取得してContestを組み立てる", async () => {
    const service = new YukiCoderService("yukicoder");
    const ctx = makeCtx((url) => {
      if (url === "https://yukicoder.me/api/v1/contest/id/1") {
        return okJson(contestJson);
      }
      if (url === "https://yukicoder.me/problems/no/1") {
        return okHtml(problemHtml([["sample1", "1 2\n", "3\n"]]));
      }
      if (url === "https://yukicoder.me/problems/no/2") {
        return okHtml(
          problemHtml([
            ["sample1", "hello\n", "world\n"],
            ["sample2", "a\n", "b\n"],
          ]),
        );
      }
      return errAsync({ type: "not_found", url });
    });

    const result = await service.fetchContest(ctx, "1");
    expect(result.isOk()).toBe(true);
    if (result.isErr()) return;
    const contest: Contest = result.value;
    expect(contest.id).toBe("1");
    expect(contest.probrems.map((p) => p.id)).toStrictEqual(["101", "102"]);
    expect(contest.probrems.map((p) => p.name)).toStrictEqual(["1", "2"]);
    expect(contest.probrems[0]?.testcases).toStrictEqual([
      { name: "sample1", input: "1 2\n", output: "3\n" },
    ]);
    expect(contest.probrems[1]?.testcases).toStrictEqual([
      { name: "sample1", input: "hello\n", output: "world\n" },
      { name: "sample2", input: "a\n", output: "b\n" },
    ]);
  });

  it("コンテストAPIの応答が不正ならvalidation_errorを返す", async () => {
    const service = new YukiCoderService("yukicoder");
    const ctx = makeCtx(() => okJson({ unexpected: true }));

    const result = await service.fetchContest(ctx, "1");
    expect(result.isErr()).toBe(true);
    if (result.isOk()) return;
    expect(result.error.type).toBe("validation_error");
  });

  it("1問でもテストケース取得に失敗したら全体をエラーにする", async () => {
    const service = new YukiCoderService("yukicoder");
    const ctx = makeCtx((url) => {
      if (url === "https://yukicoder.me/api/v1/contest/id/1") {
        return okJson(contestJson);
      }
      if (url === "https://yukicoder.me/problems/no/1") {
        return okHtml(problemHtml([["sample1", "1\n", "1\n"]]));
      }
      return errAsync({ type: "not_found", url });
    });

    const result = await service.fetchContest(ctx, "1");
    expect(result.isErr()).toBe(true);
    if (result.isOk()) return;
    expect(result.error).toStrictEqual({
      type: "not_found",
      url: "https://yukicoder.me/problems/no/2",
    });
  });

  it("preが不足している.sampleはスキップする", async () => {
    const service = new YukiCoderService("yukicoder");
    const ctx = makeCtx((url) => {
      if (url === "https://yukicoder.me/api/v1/contest/id/1") {
        return okJson({ ...contestJson, Problems: [contestJson.Problems[0]] });
      }
      return okHtml(
        `<html><body><div class="sample"><h5 class="underline">`
          + `<span>broken</span></h5><div class="paragraph">`
          + `<h6>入力</h6><pre>only-input</pre></div></div>`
          + `<div class="sample"><h5 class="underline">`
          + `<span>ok</span></h5><div class="paragraph">`
          + `<h6>入力</h6><pre>in</pre><h6>出力</h6><pre>out</pre>`
          + `</div></div></body></html>`,
      );
    });

    const result = await service.fetchContest(ctx, "1");
    expect(result.isOk()).toBe(true);
    if (result.isErr()) return;
    expect(result.value.probrems[0]?.testcases).toStrictEqual([
      { name: "ok", input: "in", output: "out" },
    ]);
  });

  it("Noがnullの問題は検証エラーにせず除外する", async () => {
    const service = new YukiCoderService("yukicoder");
    const requestedUrls: string[] = [];
    const ctx = makeCtx((url) => {
      requestedUrls.push(url);
      if (url === "https://yukicoder.me/api/v1/contest/id/1") {
        return okJson({
          ...contestJson,
          Problems: [
            { ProblemId: 101, No: 1, Title: "A" },
            { ProblemId: 999, No: null, Title: "unpublished" },
          ],
        });
      }
      if (url === "https://yukicoder.me/problems/no/1") {
        return okHtml(problemHtml([["sample1", "1\n", "1\n"]]));
      }
      return errAsync({ type: "not_found", url });
    });

    const result = await service.fetchContest(ctx, "1");
    expect(result.isOk()).toBe(true);
    if (result.isErr()) return;
    expect(result.value.probrems.map((p) => p.id)).toStrictEqual(["101"]);
    expect(result.value.probrems.map((p) => p.name)).toStrictEqual(["1"]);
    expect(requestedUrls).not.toContain(
      "https://yukicoder.me/problems/no/null",
    );
  });
});
