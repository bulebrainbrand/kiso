import { ok } from "assert";
import { existsSync, readFileSync } from "fs";
import path from "path";

import type {
  EachTestCoverageResult,
  FailedFile,
  NotFoundFile,
  NotRelatedFile,
  SuccessFile,
} from "../../scripts/testByFile";
import type { AllTestResult } from "../../scripts/types";

export interface WorkspaceMeta {
  workspace: string;
}

export function loadWorkspace(
  workspaceFile = ".kiso-ci/workspace.json",
): string {
  try {
    if (existsSync(workspaceFile)) {
      const meta = JSON.parse(
        readFileSync(workspaceFile, "utf-8"),
      ) as Partial<WorkspaceMeta>;
      if (typeof meta.workspace === "string" && meta.workspace.length > 0) {
        return meta.workspace;
      }
    }
  } catch {
    // フォールバックへ
  }
  return process.env.GITHUB_WORKSPACE ?? process.cwd();
}

export function toRelativePath(absPath: string, workspace: string): string {
  if (!path.isAbsolute(absPath)) {
    return absPath;
  }
  return path.relative(workspace, absPath).split(path.sep).join(path.posix.sep);
}

export function stripWorkspacePrefix(text: string, workspace: string): string {
  if (!text || !workspace) {
    return text;
  }
  return text.split(workspace).join(".");
}

export function normalizeAllTest(
  allTest: AllTestResult,
  workspace: string,
): AllTestResult {
  const coverageMap = Object.fromEntries(
    Object.entries(allTest.coverageMap).map(([key, value]) => [
      toRelativePath(key, workspace),
      { ...value, path: toRelativePath(value.path, workspace) },
    ]),
  );
  return {
    ...allTest,
    coverageMap,
    snapshot: {
      ...allTest.snapshot,
      filesRemovedList: allTest.snapshot.filesRemovedList.map((file) =>
        toRelativePath(file, workspace),
      ),
      uncheckedKeysByFile: allTest.snapshot.uncheckedKeysByFile.map(
        (entry) => ({
          ...entry,
          filePath: toRelativePath(entry.filePath, workspace),
        }),
      ),
    },
    testResults: allTest.testResults.map((result) => ({
      ...result,
      message: stripWorkspacePrefix(result.message, workspace),
      name: toRelativePath(result.name, workspace),
      assertionResults: result.assertionResults.map((assertion) => ({
        ...assertion,
        failureMessages: assertion.failureMessages.map((message) =>
          stripWorkspacePrefix(message, workspace),
        ),
      })),
    })),
  };
}

export function coverageToMarkdown(
  coverage: EachTestCoverageResult,
  allTest: AllTestResult,
  headSha?: string,
  workspace?: string,
): string {
  const all = normalizeAllTest(allTest, workspace ?? process.cwd());
  void all;
  void headSha;
  const entriesCoverage = Object.entries(coverage);
  const notfoundFile = entriesCoverage.filter(
    (arg): arg is [string, NotFoundFile] => arg[1].type === "not_found",
  );
  const notrelatedFile = entriesCoverage.filter(
    (arg): arg is [string, NotRelatedFile] => arg[1].type === "not_related",
  );
  const failedFile = entriesCoverage.filter(
    (arg): arg is [string, FailedFile] => arg[1].type === "failed",
  );
  const successFile = entriesCoverage.filter(
    (arg): arg is [string, SuccessFile] => arg[1].type === "success",
  );
  const okFile = successFile.filter(
    ([_key, value]) =>
      value.coverage.branches.pct === 100
      && value.coverage.functions.pct === 100
      && value.coverage.lines.pct === 100
      && value.coverage.statements.pct === 100,
  );
  const ngFile = successFile.filter(
    ([_key, value]) =>
      value.coverage.branches.pct !== 100
      && value.coverage.functions.pct !== 100
      && value.coverage.lines.pct !== 100
      && value.coverage.statements.pct !== 100,
  );
  const text = `\
## coverage report
try ${entriesCoverage.length} files. found ${entriesCoverage.length - notfoundFile.length} test file.
- non-related: ${zeroText(notrelatedFile.length)}
- failed: ${zeroText(failedFile.length)}
- success: ${successFile.length}

in ${entriesCoverage.length} files, ${okFile.length} file(s) is 100% coverage with only same name file

<details><summary>test failed files (${failedFile.length})</summary>

${failedFile.map(([name, obj]) => `- [${name}](${name}) (test: [${obj.test}](${obj.test}))`).join("\n")}

</details>

<details><summary>test was not found files (${notfoundFile.length})</summary>

${notfoundFile.map(([name]) => `- [${name}](${name})`).join("\n")}

</details>

<details><summary>not related - test didn't run target files (${notrelatedFile.length})</summary>

${notrelatedFile.map(([name, obj]) => `- [${name}](${name}) (test:[${obj.test}](${obj.test}))`).join("\n")}

</details>

<details><summary>test was success and under 100% coverage files (${ngFile.length})</summary>

${ngFile.map(([name, obj]) => `- [${name}](${name}) (${obj.coverage.statements.pct} ${obj.coverage.branches.pct} ${obj.coverage.functions.pct} ${obj.coverage.lines.pct})`).join("\n")}

</details>

<details><summary>100% coverage files (${ok.length})!</summary>

${okFile.map(([name, obj]) => `- [${name}](${name}) (test:[${obj.test}](${obj.test}))`).join("\n")}

</details>

## All test report

- success: ${all.numPassedTests}
- failed: ${zeroText(all.numFailedTests)}
- success per: ${(all.numTotalTests / all.numPassedTests) * 100}%
`;
  return text;
}

const red = (str: string) => `<span style="color: red;">${str}</span>`;
const green = (str: string) => `<span style="color: green;">${str}</span>`;
const zeroText = (num: number): string =>
  num === 0 ? green(num.toString()) : red(num.toString());
const input1 = process.argv[2] ?? ".kiso-ci/test-result.json";
const input2 = process.argv[3] ?? ".kiso-ci/all-test.json";
const headSha = process.argv[4];
const workspaceFile = process.argv[5] ?? ".kiso-ci/workspace.json";
const workspace = loadWorkspace(workspaceFile);
const coverage = JSON.parse(
  readFileSync(input1, "utf-8"),
) as EachTestCoverageResult;
const allTest = JSON.parse(readFileSync(input2, "utf-8")) as AllTestResult;
console.log(coverageToMarkdown(coverage, allTest, headSha, workspace));
