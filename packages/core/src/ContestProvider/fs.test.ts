import fs from "node:fs";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { kisoFs } from "./fs.ts";

const tmpRoots: string[] = [];

const makeTempRoot = (): string => {
  const dir = mkdtempSync(join(tmpdir(), "kiso-fs-"));
  tmpRoots.push(dir);
  return dir;
};

afterEach(() => {
  vi.restoreAllMocks();
  while (tmpRoots.length > 0) {
    const dir = tmpRoots.pop();
    if (dir) rmSync(dir, { recursive: true, force: true });
  }
});

describe("kisoFs", () => {
  it("writeFileした内容をreadFileで読める", () => {
    const root = makeTempRoot();
    const file = join(root, "hello.txt");
    expect(kisoFs.writeFile(file, "hello").isOk()).toBe(true);
    const result = kisoFs.readFile(file);
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toBe("hello");
    }
  });

  it("存在しないreadFileはENOENTのread_error", () => {
    const root = makeTempRoot();
    const result = kisoFs.readFile(join(root, "missing.txt"));
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.type).toBe("read_error");
      if (result.error.type === "read_error") {
        expect(result.error.code).toBe("ENOENT");
      }
    }
  });

  it("mkdirはネストしたディレクトリを作成する", () => {
    const root = makeTempRoot();
    const nested = join(root, "a", "b", "c");
    const result = kisoFs.mkdir(nested);
    expect(result.isOk()).toBe(true);
    expect(kisoFs.exists(nested)).toBe(true);
    const stat = kisoFs.stat(nested);
    expect(stat.isOk()).toBe(true);
    if (stat.isOk()) {
      expect(stat.value.isDirectory).toBe(true);
      expect(stat.value.isFile).toBe(false);
    }
  });

  it("statはファイルとディレクトリを区別する", () => {
    const root = makeTempRoot();
    const file = join(root, "f.txt");
    expect(kisoFs.writeFile(file, "x").isOk()).toBe(true);
    const fileStat = kisoFs.stat(file);
    expect(fileStat.isOk()).toBe(true);
    if (fileStat.isOk()) {
      expect(fileStat.value.isFile).toBe(true);
      expect(fileStat.value.isDirectory).toBe(false);
    }
    const dirStat = kisoFs.stat(root);
    expect(dirStat.isOk()).toBe(true);
    if (dirStat.isOk()) {
      expect(dirStat.value.isFile).toBe(false);
      expect(dirStat.value.isDirectory).toBe(true);
    }
  });

  it("存在しないstatはENOENTのread_error", () => {
    const root = makeTempRoot();
    const result = kisoFs.stat(join(root, "missing"));
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.type).toBe("read_error");
      if (result.error.type === "read_error") {
        expect(result.error.code).toBe("ENOENT");
      }
    }
  });

  it("rm後はexistsがfalseになる", () => {
    const root = makeTempRoot();
    const file = join(root, "target.txt");
    expect(kisoFs.writeFile(file, "x").isOk()).toBe(true);
    expect(kisoFs.exists(file)).toBe(true);
    expect(kisoFs.rm(file).isOk()).toBe(true);
    expect(kisoFs.exists(file)).toBe(false);
  });

  it("存在しないrmは成功扱いになる", () => {
    const root = makeTempRoot();
    expect(kisoFs.rm(join(root, "missing")).isOk()).toBe(true);
  });

  it("存在しないexistsはfalseになる", () => {
    const root = makeTempRoot();
    expect(kisoFs.exists(join(root, "missing"))).toBe(false);
  });

  it("存在しないディレクトリへのwriteFileはENOENTのwrite_error", () => {
    const root = makeTempRoot();
    const result = kisoFs.writeFile(join(root, "no-such-dir", "f.txt"), "x");
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.type).toBe("write_error");
      if (result.error.type === "write_error") {
        expect(result.error.code).toBe("ENOENT");
      }
    }
  });

  it("ファイルを親に持つmkdirはENOTDIRのwrite_error", () => {
    const root = makeTempRoot();
    const file = join(root, "f.txt");
    expect(kisoFs.writeFile(file, "x").isOk()).toBe(true);
    const result = kisoFs.mkdir(join(file, "child"));
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.type).toBe("write_error");
      if (result.error.type === "write_error") {
        expect(result.error.code).toBe("ENOTDIR");
      }
    }
  });
});

describe("kisoFs unexpected_error", () => {
  it("codeなしErrorはunexpected_errorになる (read系)", () => {
    vi.spyOn(fs, "readFileSync").mockImplementation(() => {
      throw new Error("boom");
    });
    const read = kisoFs.readFile("/any");
    expect(read.isErr()).toBe(true);
    if (read.isErr()) {
      expect(read.error).toStrictEqual({
        type: "unexpected_error",
        message: "Error: boom",
      });
    }
    vi.spyOn(fs, "statSync").mockImplementation(() => {
      throw new Error("boom");
    });
    const stat = kisoFs.stat("/any");
    expect(stat.isErr()).toBe(true);
    if (stat.isErr()) {
      expect(stat.error).toStrictEqual({
        type: "unexpected_error",
        message: "Error: boom",
      });
    }
  });

  it("codeなしErrorはunexpected_errorになる (write系)", () => {
    vi.spyOn(fs, "writeFileSync").mockImplementation(() => {
      throw new Error("boom");
    });
    const written = kisoFs.writeFile("/any", "x");
    expect(written.isErr()).toBe(true);
    if (written.isErr()) {
      expect(written.error).toStrictEqual({
        type: "unexpected_error",
        message: "Error: boom",
      });
    }
    vi.spyOn(fs, "mkdirSync").mockImplementation(() => {
      throw new Error("boom");
    });
    const made = kisoFs.mkdir("/any");
    expect(made.isErr()).toBe(true);
    if (made.isErr()) {
      expect(made.error).toStrictEqual({
        type: "unexpected_error",
        message: "Error: boom",
      });
    }
    vi.spyOn(fs, "rmSync").mockImplementation(() => {
      throw new Error("boom");
    });
    const removed = kisoFs.rm("/any");
    expect(removed.isErr()).toBe(true);
    if (removed.isErr()) {
      expect(removed.error).toStrictEqual({
        type: "unexpected_error",
        message: "Error: boom",
      });
    }
  });

  it("非ErrorのthrowはJSON.stringifyしてunexpected_errorになる", () => {
    vi.spyOn(fs, "readFileSync").mockImplementation(() => {
      throw { reason: "disk gone" };
    });
    const read = kisoFs.readFile("/any");
    expect(read.isErr()).toBe(true);
    if (read.isErr()) {
      expect(read.error).toStrictEqual({
        type: "unexpected_error",
        message: '{"reason":"disk gone"}',
      });
    }
    vi.spyOn(fs, "writeFileSync").mockImplementation(() => {
      throw { reason: "disk gone" };
    });
    const written = kisoFs.writeFile("/any", "x");
    expect(written.isErr()).toBe(true);
    if (written.isErr()) {
      expect(written.error).toStrictEqual({
        type: "unexpected_error",
        message: '{"reason":"disk gone"}',
      });
    }
  });
});
