import { join } from "node:path";

import type { BaseContext } from "@kiso/types";
import type { FetchError } from "@kiso/types";
import * as TE from "fp-ts/TaskEither";
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
  handler: (url: string) => TE.TaskEither<FetchError, Response>,
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
    fs: {
      providerDir: { rootDir: "test-root" },
      workspaceDir: { rootDir: "test-root" },
    } as YukicoderCtx["fs"],
  }) as YukicoderCtx;

const okJson = (body: unknown) =>
  TE.right(
    new Response(JSON.stringify(body), {
      headers: { "content-type": "application/json" },
    }),
  );

const okHtml = (html: string) =>
  TE.right(new Response(html, { headers: { "content-type": "text/html" } }));

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
      return TE.left({ type: "not_found", url });
    });

    const result = await service.fetchContest(ctx, "1")();
    expect(result).toBeRight({
      id: "1",
      probrems: [
        {
          id: "101",
          name: "1",
          testcases: [{ name: "sample1", input: "1 2\n", output: "3\n" }],
        },
        {
          id: "102",
          name: "2",
          testcases: [
            { name: "sample1", input: "hello\n", output: "world\n" },
            { name: "sample2", input: "a\n", output: "b\n" },
          ],
        },
      ],
    });
  });

  it("コンテストAPIの応答が不正ならvalidation_errorを返す", async () => {
    const service = new YukiCoderService("yukicoder");
    const ctx = makeCtx(() => okJson({ unexpected: true }));

    const result = await service.fetchContest(ctx, "1")();
    expect(result).toBeLeftWith((e) => {
      expect(e.type).toBe("validation_error");
    });
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
      return TE.left({ type: "not_found", url });
    });

    const result = await service.fetchContest(ctx, "1")();
    expect(result).toStrictEqualLeft({
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

    const result = await service.fetchContest(ctx, "1")();
    expect(result).toBeRight({
      id: "1",
      probrems: [
        {
          id: "101",
          name: "1",
          testcases: [{ name: "ok", input: "in", output: "out" }],
        },
      ],
    });
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
      return TE.left({ type: "not_found", url });
    });

    const result = await service.fetchContest(ctx, "1")();
    expect(result).toBeRight({
      id: "1",
      probrems: [
        {
          id: "101",
          name: "1",
          testcases: [{ name: "sample1", input: "1\n", output: "1\n" }],
        },
      ],
    });
    expect(requestedUrls).not.toContain(
      "https://yukicoder.me/problems/no/null",
    );
  });
});

describe("YukiCoderService.isTargetUrl", () => {
  it("yukicoder.meのURLならtrueを返す", async () => {
    const service = new YukiCoderService("yukicoder");
    const ctx = makeCtx(() => TE.left({ type: "not_found", url: "" }));
    for (const url of [
      "https://yukicoder.me",
      "https://yukicoder.me/contests/100",
      "https://yukicoder.me/problems/no/1",
    ]) {
      expect(await service.isTargetUrl(ctx, url)()).toBeRight(true);
    }
  });

  it("yukicoder.me以外のURLならfalseを返す", async () => {
    const service = new YukiCoderService("yukicoder");
    const ctx = makeCtx(() => TE.left({ type: "not_found", url: "" }));
    for (const url of [
      "https://atcoder.jp/contests/abc001",
      "http://yukicoder.me/problems/no/1",
      "",
    ]) {
      expect(await service.isTargetUrl(ctx, url)()).toBeRight(false);
    }
  });
});

describe("YukiCoderService.isTargetId", () => {
  it("数値のコンテストIDならtrueを返す", async () => {
    const service = new YukiCoderService("yukicoder");
    const ctx = makeCtx(() => TE.left({ type: "not_found", url: "" }));
    for (const id of ["1", "100", "123"]) {
      expect(await service.isTargetId(ctx, id)()).toBeRight(true);
    }
  });

  it("数値でないIDならfalseを返す", async () => {
    const service = new YukiCoderService("yukicoder");
    const ctx = makeCtx(() => TE.left({ type: "not_found", url: "" }));
    for (const id of [
      "abc100",
      "1a",
      "",
      "https://yukicoder.me/contests/100",
    ]) {
      expect(await service.isTargetId(ctx, id)()).toBeRight(false);
    }
  });
});

describe("YukiCoderService.parseContestIdFromUrl", () => {
  it("コンテストURLからIDを抽出する", async () => {
    const service = new YukiCoderService("yukicoder");
    const ctx = makeCtx(() => TE.left({ type: "not_found", url: "" }));
    for (const [url, id] of [
      ["https://yukicoder.me/contests/100", "100"],
      ["https://yukicoder.me/contests/100/", "100"],
      ["https://yukicoder.me/contests/1", "1"],
    ] as const) {
      expect(await service.parseContestIdFromUrl(ctx, url)()).toStrictEqualSome(
        id,
      );
    }
  });

  it("コンテストURLでなければnoneを返す", async () => {
    const service = new YukiCoderService("yukicoder");
    const ctx = makeCtx(() => TE.left({ type: "not_found", url: "" }));
    for (const url of [
      "https://yukicoder.me/problems/no/1",
      "https://yukicoder.me",
      "https://atcoder.jp/contests/abc001",
      "https://yukicoder.me/contests/abc",
      "not a url",
      "",
    ]) {
      expect(await service.parseContestIdFromUrl(ctx, url)()).toBeNone();
    }
  });
});

describe("YukiCoderService.getContestDirectory", () => {
  it("コンテストIDからディレクトリパスを返す", async () => {
    const service = new YukiCoderService("yukicoder");
    const ctx = makeCtx(() => TE.left({ type: "not_found", url: "" }));

    expect(
      await service.getContestDirectory(ctx, { id: "123", probrems: [] })(),
    ).toBeRight(join("test-root", "123"));
  });
});
