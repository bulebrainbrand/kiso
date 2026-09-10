export type TestSuccess = {
  type: "success";
  id: string;
};

export type TestFailed = {
  type: "failed";
  id: string;
  expect: string;
  actual: string;
};

export type TestError = {
  type: "error";
  id: string;
  error: string;
};

export type TestResult = TestSuccess | TestFailed | TestError;

export type CompareOptions = {
  ignoreFinalNewline?: boolean;
};

export type JudgeOptions = {
  compare?: CompareOptions;
};
