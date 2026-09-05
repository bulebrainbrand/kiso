import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "fs";
import path, { matchesGlob } from "path";

import { createVitest } from "vite-plus/test/node";
let fullStr = "";
for await (const str of process.stdin) {
  fullStr += str.toString();
}
const vitest = await createVitest("test", {
  silent: true,
  coverage: { reporter: ["json-summary"] },
  reporters: [{}],
});
const isTestFile = (file: string): boolean =>
  vitest.projects.some((project) => project.matchesTestGlob(file));
const ignorePatterns = ["vite.config.ts", "!*.ts"];
const toTestFile = (file: string): string =>
  path.join(
    path.dirname(file),
    path.basename(file).slice(0, -path.extname(file).length)
      + ".test"
      + path.extname(file),
  );
const targetFiles = fullStr
  .split("\n")
  .filter((str) => str.length !== 0)
  .filter((str) =>
    ignorePatterns.every((pattern) => !matchesGlob(str, pattern)),
  )
  .map((str) => path.resolve(str))
  .filter((str) => !isTestFile(str));
const testFiles = targetFiles.map((str) => toTestFile(str));

export type Coverage = {
  total: number;
  covered: number;
  skipped: number;
  pct: number;
};

export type SuccessFile = {
  type: "success";
  coverage: {
    lines: Coverage;
    functions: Coverage;
    statements: Coverage;
    branches: Coverage;
  };
  test: string;
};

export type FailedFile = { type: "failed"; error: unknown[]; test: string };
export type NotRelatedFile = { type: "not_related"; test: string };
export type NotFoundFile = { type: "not_found"; expect: string };
export type EachTestCoverageResult = Record<
  string,
  SuccessFile | FailedFile | NotRelatedFile | NotFoundFile
>;
const result: EachTestCoverageResult = {};
for (const [i, file] of testFiles.entries()) {
  const target = path.relative(process.cwd(), targetFiles[i]);
  if (!existsSync(target)) continue;
  if (!existsSync(file)) {
    result[target] = { type: "not_found", expect: target };
    continue;
  }
  const { unhandledErrors } = await vitest.start([file]);
  if (unhandledErrors.length !== 0) {
    result[target] = {
      type: "failed",
      error: unhandledErrors,
      test: path.relative(process.cwd(), file),
    };
    continue;
  }
  const coverage = JSON.parse(
    readFileSync("./coverage/coverage-summary.json").toString(),
  );
  const coverageResult = coverage[target];
  if (coverageResult) {
    result[target] = {
      type: "success",
      coverage,
      test: path.relative(process.cwd(), file),
    };
  } else {
    result[target] = {
      type: "not_related",
      test: path.relative(process.cwd(), file),
    };
  }
  rmSync("./coverage/coverage-summary.json");
}
await vitest.close();
mkdirSync(".kiso-ci", { recursive: true });
writeFileSync(".kiso-ci/test-result.json", JSON.stringify(result));
