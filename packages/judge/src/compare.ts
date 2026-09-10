import type { CompareOptions } from "@kiso/types";

const stripFinalNewlines = (output: string): string =>
  output.replace(/(\r\n|\n|\r)+$/, "");

export const normalizeOutput = (
  output: string,
  options?: CompareOptions,
): string =>
  (options?.ignoreFinalNewline ?? true) ? stripFinalNewlines(output) : output;

export const compareOutputs = (
  expect: string,
  actual: string,
  options?: CompareOptions,
): boolean =>
  normalizeOutput(expect, options) === normalizeOutput(actual, options);
