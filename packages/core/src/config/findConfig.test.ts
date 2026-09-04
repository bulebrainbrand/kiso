import { join, resolve } from "node:path";
import { memfs } from "memfs";
import { describe, expect, it } from "vite-plus/test";
import { KISO_CONFIG_FILE_NAME } from "../constants.ts";
import type { FS } from "../types/fs.ts";
import { findConfig } from "./findConfig.ts";

const setupFs = (json: Record<string, string | null>): FS => memfs(json, "/").fs as unknown as FS;

const CONFIG_CONTENT = "export default {};\n";

describe("findConfig", () => {
  it("cwd直下のconfigを見つける", () => {
    const cwd = resolve("/proj/a");
    const fs = setupFs({ [join(cwd, KISO_CONFIG_FILE_NAME)]: CONFIG_CONTENT });
    const result = findConfig(fs, cwd);
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toBe(join(cwd, KISO_CONFIG_FILE_NAME));
    }
  });

  it("上位階層のconfigを見つける", () => {
    const root = resolve("/proj");
    const cwd = join(root, "a", "b", "c");
    const fs = setupFs({ [join(root, KISO_CONFIG_FILE_NAME)]: CONFIG_CONTENT });
    const result = findConfig(fs, cwd);
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toBe(join(root, KISO_CONFIG_FILE_NAME));
    }
  });

  it("最も近いconfigを優先する", () => {
    const root = resolve("/proj");
    const middle = join(root, "a");
    const cwd = join(middle, "b", "c");
    const fs = setupFs({
      [join(root, KISO_CONFIG_FILE_NAME)]: CONFIG_CONTENT,
      [join(middle, KISO_CONFIG_FILE_NAME)]: CONFIG_CONTENT,
    });
    const result = findConfig(fs, cwd);
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toBe(join(middle, KISO_CONFIG_FILE_NAME));
    }
  });

  it("見つからない場合はnot_foundを返す", () => {
    const fs = setupFs({});
    const result = findConfig(fs, resolve("/proj/a/b"));
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toEqual({ type: "not_found" });
    }
  });

  it("同名のディレクトリがある場合はis_directoryを返す", () => {
    const cwd = resolve("/proj/a");
    const candidate = join(cwd, KISO_CONFIG_FILE_NAME);
    const fs = setupFs({ [candidate]: null });
    const result = findConfig(fs, cwd);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toEqual({ type: "is_directory", path: candidate });
    }
  });

  it("同名ディレクトリが近くにある場合は親のconfigを使わずis_directoryを返す", () => {
    const root = resolve("/proj");
    const middle = join(root, "a");
    const cwd = join(middle, "b", "c");
    const dirCandidate = join(middle, KISO_CONFIG_FILE_NAME);
    const fs = setupFs({
      [join(root, KISO_CONFIG_FILE_NAME)]: CONFIG_CONTENT,
      [dirCandidate]: null,
    });
    const result = findConfig(fs, cwd);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toEqual({ type: "is_directory", path: dirCandidate });
    }
  });
});
