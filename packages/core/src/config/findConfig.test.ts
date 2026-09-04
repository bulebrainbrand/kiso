import { join, resolve } from "node:path";
import { describe, expect, it } from "vite-plus/test";
import { KISO_CONFIG_FILE_NAME } from "../constants.ts";
import type { FS } from "../types/fs.ts";
import { findConfig } from "./findConfig.ts";

const mockFs = (existingFiles: Set<string>): FS =>
  ({
    existsSync: (p: string) => existingFiles.has(p),
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
});
