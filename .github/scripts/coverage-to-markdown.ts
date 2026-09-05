import { readFileSync } from "fs";

import { EachTestCoverageResult } from "../../scripts/testByFile";
import { AllTestResult } from "../../scripts/types";
export function coverageToMarkdown(
  coverage: EachTestCoverageResult,
  allTest: AllTestResult,
  headSha?: string,
): string {
  void coverage;
  void headSha;
  return "gooooooooo";
}

const input1 = process.argv[2] ?? ".kiso-ci/test-result.json";
const input2 = process.argv[3] ?? ".kiso-ci/all-test.json";
const headSha = process.argv[4];
const coverage = JSON.parse(
  readFileSync(input1, "utf-8"),
) as EachTestCoverageResult;
const allTest = JSON.parse(readFileSync(input2, "utf-8")) as AllTestResult;
console.log(coverageToMarkdown(coverage, allTest, headSha));
