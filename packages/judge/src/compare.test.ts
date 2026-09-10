import { describe, expect, it } from "vite-plus/test";

import { compareOutputs } from "./compare.ts";

describe("compareOutputs", () => {
  it("完全一致はpass", () => {
    expect(compareOutputs("3\n", "3\n")).toBe(true);
  });

  it("不一致はfail", () => {
    expect(compareOutputs("3\n", "4\n")).toBe(false);
  });

  it("末尾改行の差は既定で無視する", () => {
    expect(compareOutputs("3\n", "3")).toBe(true);
    expect(compareOutputs("3", "3\n")).toBe(true);
  });

  it("末尾の複数改行・CRLFも無視する", () => {
    expect(compareOutputs("3\n\n", "3")).toBe(true);
    expect(compareOutputs("3\r\n", "3\n")).toBe(true);
  });

  it("途中改行の差は無視しない", () => {
    expect(compareOutputs("1\n2\n", "1\n\n2\n")).toBe(false);
  });

  it("ignoreFinalNewline: falseでは末尾改行の差でfail", () => {
    expect(compareOutputs("3\n", "3", { ignoreFinalNewline: false })).toBe(
      false,
    );
  });
});
