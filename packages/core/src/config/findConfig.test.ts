import { join, resolve } from "node:path";
import { describe, expect, it } from "vite-plus/test";
import { KISO_CONFIG_FILE_NAME } from "../constants.ts";
import type { FS } from "../types/fs.ts";
import { findConfig } from "./findConfig.ts";

const mockFs = (
  existingFiles: Set<string>,
  existingDirs: Set<string> = new Set(),
  statThrowsOn: Set<string> = new Set(),
): FS =>
  ({
    existsSync: (p: string) => existingFiles.has(p) || existingDirs.has(p),
    statSync: (p: string) => {
      if (statThrowsOn.has(p)) throw new Error(`mock stat failure: ${p}`);
      return { isFile: () => existingFiles.has(p) };
    },
  }) as unknown as FS;

describe("findConfig", () => {
  it("cwd直下のconfigを見つける", () => {
    const cwd = resolve("/proj/a");
    const fs = mockFs(new Set([join(cwd, KISO_CONFIG_FILE_NAME)]));
    const result = findConfig(fs, cwd);
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toBe(join(cwd, KISO_CONFIG_FILE_NAME));
    }
  });

  it("上位階層のconfigを見つける", () => {
    const root = resolve("/proj");
    const cwd = join(root, "a", "b", "c");
    const fs = mockFs(new Set([join(root, KISO_CONFIG_FILE_NAME)]));
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
    const fs = mockFs(
      new Set([join(root, KISO_CONFIG_FILE_NAME), join(middle, KISO_CONFIG_FILE_NAME)]),
    );
    const result = findConfig(fs, cwd);
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toBe(join(middle, KISO_CONFIG_FILE_NAME));
    }
  });

  it("見つからない場合はnot_foundを返す", () => {
    const fs = mockFs(new Set());
    const result = findConfig(fs, resolve("/proj/a/b"));
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toEqual({ type: "not_found" });
    }
  });

  it("同名のディレクトリがある場合はis_directoryを返す", () => {
    const cwd = resolve("/proj/a");
    const candidate = join(cwd, KISO_CONFIG_FILE_NAME);
    const fs = mockFs(new Set(), new Set([candidate]));
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
    const fs = mockFs(new Set([join(root, KISO_CONFIG_FILE_NAME)]), new Set([dirCandidate]));
    const result = findConfig(fs, cwd);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toEqual({ type: "is_directory", path: dirCandidate });
    }
  });

  it("statSyncが失敗した場合はstat_errorを返す", () => {
    const cwd = resolve("/proj/a");
    const candidate = join(cwd, KISO_CONFIG_FILE_NAME);
    const cause = new Error(`mock stat failure: ${candidate}`);
    const fs: FS = {
      existsSync: () => true,
      statSync: () => {
        throw cause;
      },
    } as unknown as FS;
    const result = findConfig(fs, cwd);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toEqual({ type: "stat_error", path: candidate, cause });
    }
  });
});
