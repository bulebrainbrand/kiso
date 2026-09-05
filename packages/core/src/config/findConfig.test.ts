import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vite-plus/test";

import { KISO_CONFIG_FILE_NAME } from "../constants.ts";
import { findConfig } from "./findConfig.ts";

const CONFIG_CONTENT = "export default {};\n";

const tmpRoots: string[] = [];

const makeTempRoot = (): string => {
  const dir = mkdtempSync(join(tmpdir(), "kiso-find-config-"));
  tmpRoots.push(dir);
  return dir;
};

afterEach(() => {
  while (tmpRoots.length > 0) {
    const dir = tmpRoots.pop();
    if (dir) rmSync(dir, { recursive: true, force: true });
  }
});

describe("findConfig", () => {
  it("cwd直下のconfigを見つける", () => {
    const cwd = join(makeTempRoot(), "a");
    mkdirSync(cwd, { recursive: true });
    writeFileSync(join(cwd, KISO_CONFIG_FILE_NAME), CONFIG_CONTENT);
    const result = findConfig(cwd);
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toBe(join(cwd, KISO_CONFIG_FILE_NAME));
    }
  });

  it("上位階層のconfigを見つける", () => {
    const root = makeTempRoot();
    const cwd = join(root, "a", "b", "c");
    mkdirSync(cwd, { recursive: true });
    writeFileSync(join(root, KISO_CONFIG_FILE_NAME), CONFIG_CONTENT);
    const result = findConfig(cwd);
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toBe(join(root, KISO_CONFIG_FILE_NAME));
    }
  });

  it("最も近いconfigを優先する", () => {
    const root = makeTempRoot();
    const middle = join(root, "a");
    const cwd = join(middle, "b", "c");
    mkdirSync(cwd, { recursive: true });
    writeFileSync(join(root, KISO_CONFIG_FILE_NAME), CONFIG_CONTENT);
    writeFileSync(join(middle, KISO_CONFIG_FILE_NAME), CONFIG_CONTENT);
    const result = findConfig(cwd);
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toBe(join(middle, KISO_CONFIG_FILE_NAME));
    }
  });

  it("見つからない場合はnot_foundを返す", () => {
    const cwd = join(makeTempRoot(), "a", "b");
    mkdirSync(cwd, { recursive: true });
    const result = findConfig(cwd);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toEqual({ type: "not_found" });
    }
  });

  it("同名のディレクトリがある場合はis_directoryを返す", () => {
    const cwd = join(makeTempRoot(), "a");
    const candidate = join(cwd, KISO_CONFIG_FILE_NAME);
    mkdirSync(candidate, { recursive: true });
    const result = findConfig(cwd);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toEqual({ type: "is_directory", path: candidate });
    }
  });

  it("同名ディレクトリが近くにある場合は親のconfigを使わずis_directoryを返す", () => {
    const root = makeTempRoot();
    const middle = join(root, "a");
    const cwd = join(middle, "b", "c");
    mkdirSync(cwd, { recursive: true });
    const dirCandidate = join(middle, KISO_CONFIG_FILE_NAME);
    writeFileSync(join(root, KISO_CONFIG_FILE_NAME), CONFIG_CONTENT);
    mkdirSync(dirCandidate, { recursive: true });
    const result = findConfig(cwd);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toEqual({
        type: "is_directory",
        path: dirCandidate,
      });
    }
  });
});
