export interface AllTestResult {
  numTotalTestSuites: number;
  numPassedTestSuites: number;
  numFailedTestSuites: number;
  numPendingTestSuites: number;
  numTotalTests: number;
  numPassedTests: number;
  numFailedTests: number;
  numPendingTests: number;
  numTodoTests: number;
  snapshot: SnapshotSummary;
  startTime: number;
  success: boolean;
  testResults: TestFileResult[];
  coverageMap: CoverageMap;
}

export interface SnapshotSummary {
  added: number;
  failure: boolean;
  filesAdded: number;
  filesRemoved: number;
  filesRemovedList: string[];
  filesUnmatched: number;
  filesUpdated: number;
  matched: number;
  total: number;
  unchecked: number;
  uncheckedKeysByFile: UncheckedSnapshot[];
  unmatched: number;
  updated: number;
  didUpdate: boolean;
}

export interface UncheckedSnapshot {
  filePath: string;
  keys: string[];
}

export interface TestFileResult {
  assertionResults: AssertionResult[];
  startTime: number;
  endTime: number;
  status: TestStatus;
  message: string;
  name: string;
}

export interface AssertionResult {
  ancestorTitles: string[];
  fullName: string;
  status: TestStatus;
  title: string;
  duration: number;
  failureMessages: string[];
  meta: Record<string, unknown>;
  tags: string[];
}

export type TestStatus =
  | "disabled"
  | "failed"
  | "focused"
  | "passed"
  | "pending"
  | "skipped"
  | "todo";

export type CoverageMap = Record<string, FileCoverage>;

export interface FileCoverage {
  path: string;
  statementMap: Record<string, CoverageRange>;
  fnMap: Record<string, FunctionCoverage>;
  branchMap: Record<string, BranchCoverage>;
  s: Record<string, number>;
  f: Record<string, number>;
  b: Record<string, number[]>;
  meta: CoverageMeta;
}

export interface CoveragePosition {
  line: number;
  column: number | null;
}

export interface CoverageRange {
  start: CoveragePosition;
  end: CoveragePosition;
}

export interface OptionalCoveragePosition {
  line?: number;
  column?: number | null;
}

export interface OptionalCoverageRange {
  start: OptionalCoveragePosition;
  end: OptionalCoveragePosition;
}

export interface FunctionCoverage {
  name: string;
  decl: CoverageRange;
  loc: CoverageRange;
  line: number;
}

export interface BranchCoverage {
  loc: CoverageRange;
  type: BranchType;
  locations: OptionalCoverageRange[];
  line: number;
}

export type BranchType = "binary-expr" | "cond-expr" | "if" | "switch";

export interface CoverageMeta {
  lastBranch: number;
  lastFunction: number;
  lastStatement: number;
  seen: Record<string, number>;
  fnNames: Record<string, string>;
}
