import { readFileSync } from "fs";

type Coverage = { total: number; covered: number; skipped: number; pct: number };

type TestResult = Record<
  string,
  | {
      type: "success";
      coverage: {
        lines: Coverage;
        functions: Coverage;
        statements: Coverage;
        branches: Coverage;
      };
      test: string;
    }
  | { type: "failed"; error: unknown[]; test: string }
  | { type: "not_related"; test: string }
  | { type: "not_found"; expect: string }
>;

export function coverageToMarkdown(coverage: TestResult, headSha?: string): string {
  void coverage;
  void headSha;
  return "gooooooooo";
}

const input = process.argv[2] ?? ".kiso-ci/test-result.json";
const headSha = process.argv[3];
const coverage = JSON.parse(readFileSync(input, "utf-8")) as TestResult;
console.log(coverageToMarkdown(coverage, headSha));
