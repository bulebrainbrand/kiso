import fs from "node:fs";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import * as E from "fp-ts/Either";
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
    expect(E.isRight(kisoFs.writeFile(file, "hello"))).toBe(true);
    const result = kisoFs.readFile(file);
    expect(E.isRight(result)).toBe(true);
    if (E.isRight(result)) {
      expect(result.right).toBe("hello");
    }
  });

  it("存在しないreadFileはENOENTのread_error", () => {
    const root = makeTempRoot();
    const result = kisoFs.readFile(join(root, "missing.txt"));
    expect(E.isLeft(result)).toBe(true);
    if (E.isLeft(result)) {
      expect(result.left.type).toBe("read_error");
      if (result.left.type === "read_error") {
        expect(result.left.code).toBe("ENOENT");
      }
    }
  });

  it("mkdirはネストしたディレクトリを作成する", () => {
    const root = makeTempRoot();
    const nested = join(root, "a", "b", "c");
    const result = kisoFs.mkdir(nested);
    expect(E.isRight(result)).toBe(true);
    expect(kisoFs.exists(nested)).toBe(true);
    const stat = kisoFs.stat(nested);
    expect(E.isRight(stat)).toBe(true);
    if (E.isRight(stat)) {
      expect(stat.right.isDirectory).toBe(true);
      expect(stat.right.isFile).toBe(false);
    }
  });

  it("statはファイルとディレクトリを区別する", () => {
    const root = makeTempRoot();
    const file = join(root, "f.txt");
    expect(E.isRight(kisoFs.writeFile(file, "x"))).toBe(true);
    const fileStat = kisoFs.stat(file);
    expect(E.isRight(fileStat)).toBe(true);
    if (E.isRight(fileStat)) {
      expect(fileStat.right.isFile).toBe(true);
      expect(fileStat.right.isDirectory).toBe(false);
    }
    const dirStat = kisoFs.stat(root);
    expect(E.isRight(dirStat)).toBe(true);
    if (E.isRight(dirStat)) {
      expect(dirStat.right.isFile).toBe(false);
      expect(dirStat.right.isDirectory).toBe(true);
    }
  });

  it("存在しないstatはENOENTのread_error", () => {
    const root = makeTempRoot();
    const result = kisoFs.stat(join(root, "missing"));
    expect(E.isLeft(result)).toBe(true);
    if (E.isLeft(result)) {
      expect(result.left.type).toBe("read_error");
      if (result.left.type === "read_error") {
        expect(result.left.code).toBe("ENOENT");
      }
    }
  });

  it("rm後はexistsがfalseになる", () => {
    const root = makeTempRoot();
    const file = join(root, "target.txt");
    expect(E.isRight(kisoFs.writeFile(file, "x"))).toBe(true);
    expect(kisoFs.exists(file)).toBe(true);
    expect(E.isRight(kisoFs.rm(file))).toBe(true);
    expect(kisoFs.exists(file)).toBe(false);
  });

  it("存在しないrmは成功扱いになる", () => {
    const root = makeTempRoot();
    expect(E.isRight(kisoFs.rm(join(root, "missing")))).toBe(true);
  });

  it("存在しないexistsはfalseになる", () => {
    const root = makeTempRoot();
    expect(kisoFs.exists(join(root, "missing"))).toBe(false);
  });

  it("存在しないディレクトリへのwriteFileはENOENTのwrite_error", () => {
    const root = makeTempRoot();
    const result = kisoFs.writeFile(join(root, "no-such-dir", "f.txt"), "x");
    expect(E.isLeft(result)).toBe(true);
    if (E.isLeft(result)) {
      expect(result.left.type).toBe("write_error");
      if (result.left.type === "write_error") {
        expect(result.left.code).toBe("ENOENT");
      }
    }
  });

  it("ファイルを親に持つmkdirはENOTDIRのwrite_error", () => {
    const root = makeTempRoot();
    const file = join(root, "f.txt");
    expect(E.isRight(kisoFs.writeFile(file, "x"))).toBe(true);
    const result = kisoFs.mkdir(join(file, "child"));
    expect(E.isLeft(result)).toBe(true);
    if (E.isLeft(result)) {
      expect(result.left.type).toBe("write_error");
      if (result.left.type === "write_error") {
        expect(result.left.code).toBe("ENOTDIR");
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
    expect(E.isLeft(read)).toBe(true);
    if (E.isLeft(read)) {
      expect(read.left).toStrictEqual({
        type: "unexpected_error",
        message: "Error: boom",
      });
    }
    vi.spyOn(fs, "statSync").mockImplementation(() => {
      throw new Error("boom");
    });
    const stat = kisoFs.stat("/any");
    expect(E.isLeft(stat)).toBe(true);
    if (E.isLeft(stat)) {
      expect(stat.left).toStrictEqual({
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
    expect(E.isLeft(written)).toBe(true);
    if (E.isLeft(written)) {
      expect(written.left).toStrictEqual({
        type: "unexpected_error",
        message: "Error: boom",
      });
    }
    vi.spyOn(fs, "mkdirSync").mockImplementation(() => {
      throw new Error("boom");
    });
    const made = kisoFs.mkdir("/any");
    expect(E.isLeft(made)).toBe(true);
    if (E.isLeft(made)) {
      expect(made.left).toStrictEqual({
        type: "unexpected_error",
        message: "Error: boom",
      });
    }
    vi.spyOn(fs, "rmSync").mockImplementation(() => {
      throw new Error("boom");
    });
    const removed = kisoFs.rm("/any");
    expect(E.isLeft(removed)).toBe(true);
    if (E.isLeft(removed)) {
      expect(removed.left).toStrictEqual({
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
    expect(E.isLeft(read)).toBe(true);
    if (E.isLeft(read)) {
      expect(read.left).toStrictEqual({
        type: "unexpected_error",
        message: '{"reason":"disk gone"}',
      });
    }
    vi.spyOn(fs, "writeFileSync").mockImplementation(() => {
      throw { reason: "disk gone" };
    });
    const written = kisoFs.writeFile("/any", "x");
    expect(E.isLeft(written)).toBe(true);
    if (E.isLeft(written)) {
      expect(written.left).toStrictEqual({
        type: "unexpected_error",
        message: '{"reason":"disk gone"}',
      });
    }
  });
});
