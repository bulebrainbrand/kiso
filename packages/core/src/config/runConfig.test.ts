import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vite-plus/test";
import { KISO_CONFIG_FILE_NAME } from "../constants.ts";
import { runConfig } from "./runConfig.ts";

const tmpRoots: string[] = [];

const makeTempRoot = (): string => {
  const dir = mkdtempSync(join(tmpdir(), "kiso-run-config-"));
  tmpRoots.push(dir);
  return dir;
};

const writeConfig = (dir: string, content: string): string => {
  const path = join(dir, KISO_CONFIG_FILE_NAME);
  writeFileSync(path, content);
  return path;
};

afterEach(() => {
  while (tmpRoots.length > 0) {
    const dir = tmpRoots.pop();
    if (dir) rmSync(dir, { recursive: true, force: true });
  }
});

describe("runConfig", () => {
  it("default exportのオブジェクトを読み込める", async () => {
    const path = writeConfig(makeTempRoot(), 'export default { foo: "bar" };\n');
    const result = await runConfig(path);
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toEqual({ default: { foo: "bar" } });
    }
  });

  it("TypeScript構文を含むconfigを読み込める", async () => {
    const path = writeConfig(makeTempRoot(), "const x: number = 1;\nexport default { x };\n");
    const result = await runConfig(path);
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toEqual({ default: { x: 1 } });
    }
  });

  it("プリミティブのdefault exportを読み込める", async () => {
    const path = writeConfig(makeTempRoot(), "export default 42;\n");
    const result = await runConfig(path);
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toEqual({ default: 42 });
    }
  });

  it("存在しないパスの場合はjiti_errorを返す", async () => {
    const path = join(makeTempRoot(), KISO_CONFIG_FILE_NAME);
    const result = await runConfig(path);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.type).toBe("jiti_error");
    }
  });

  it("シンタックスエラーの場合はjiti_errorを返す", async () => {
    const path = writeConfig(makeTempRoot(), "export default {;\n");
    const result = await runConfig(path);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.type).toBe("jiti_error");
    }
  });

  it("評価時にthrowする場合はjiti_errorを返す", async () => {
    const path = writeConfig(makeTempRoot(), 'throw new Error("boom");\n');
    const result = await runConfig(path);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.type).toBe("jiti_error");
    }
  });
});
