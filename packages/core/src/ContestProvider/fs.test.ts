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
    expect(kisoFs.writeFile(file, "hello")).toBeRight();
    expect(kisoFs.readFile(file)).toBeRight("hello");
  });

  it("存在しないreadFileはENOENTのread_error", () => {
    const root = makeTempRoot();
    expect(kisoFs.readFile(join(root, "missing.txt"))).toBeLeftWith((e) => {
      expect(e).toMatchObject({ type: "read_error", code: "ENOENT" });
    });
  });

  it("mkdirはネストしたディレクトリを作成する", () => {
    const root = makeTempRoot();
    const nested = join(root, "a", "b", "c");
    expect(kisoFs.mkdir(nested)).toBeRight();
    expect(kisoFs.exists(nested)).toBe(true);
    expect(kisoFs.stat(nested)).toBeRight({
      isDirectory: true,
      isFile: false,
    });
  });

  it("statはファイルとディレクトリを区別する", () => {
    const root = makeTempRoot();
    const file = join(root, "f.txt");
    expect(kisoFs.writeFile(file, "x")).toBeRight();
    expect(kisoFs.stat(file)).toBeRight({ isFile: true, isDirectory: false });
    expect(kisoFs.stat(root)).toBeRight({ isFile: false, isDirectory: true });
  });

  it("存在しないstatはENOENTのread_error", () => {
    const root = makeTempRoot();
    expect(kisoFs.stat(join(root, "missing"))).toBeLeftWith((e) => {
      expect(e).toMatchObject({ type: "read_error", code: "ENOENT" });
    });
  });

  it("rm後はexistsがfalseになる", () => {
    const root = makeTempRoot();
    const file = join(root, "target.txt");
    expect(kisoFs.writeFile(file, "x")).toBeRight();
    expect(kisoFs.exists(file)).toBe(true);
    expect(kisoFs.rm(file)).toBeRight();
    expect(kisoFs.exists(file)).toBe(false);
  });

  it("存在しないrmは成功扱いになる", () => {
    const root = makeTempRoot();
    expect(kisoFs.rm(join(root, "missing"))).toBeRight();
  });

  it("存在しないexistsはfalseになる", () => {
    const root = makeTempRoot();
    expect(kisoFs.exists(join(root, "missing"))).toBe(false);
  });

  it("存在しないディレクトリへのwriteFileはENOENTのwrite_error", () => {
    const root = makeTempRoot();
    expect(
      kisoFs.writeFile(join(root, "no-such-dir", "f.txt"), "x"),
    ).toBeLeftWith((e) => {
      expect(e).toMatchObject({ type: "write_error", code: "ENOENT" });
    });
  });

  it("ファイルを親に持つmkdirはENOTDIRのwrite_error", () => {
    const root = makeTempRoot();
    const file = join(root, "f.txt");
    expect(kisoFs.writeFile(file, "x")).toBeRight();
    expect(kisoFs.mkdir(join(file, "child"))).toBeLeftWith((e) => {
      expect(e).toMatchObject({ type: "write_error", code: "ENOTDIR" });
    });
  });
});

describe("kisoFs unexpected_error", () => {
  it("codeなしErrorはunexpected_errorになる (read系)", () => {
    vi.spyOn(fs, "readFileSync").mockImplementation(() => {
      throw new Error("boom");
    });
    expect(kisoFs.readFile("/any")).toStrictEqualLeft({
      type: "unexpected_error",
      message: "Error: boom",
    });
    vi.spyOn(fs, "statSync").mockImplementation(() => {
      throw new Error("boom");
    });
    expect(kisoFs.stat("/any")).toStrictEqualLeft({
      type: "unexpected_error",
      message: "Error: boom",
    });
  });

  it("codeなしErrorはunexpected_errorになる (write系)", () => {
    vi.spyOn(fs, "writeFileSync").mockImplementation(() => {
      throw new Error("boom");
    });
    expect(kisoFs.writeFile("/any", "x")).toStrictEqualLeft({
      type: "unexpected_error",
      message: "Error: boom",
    });
    vi.spyOn(fs, "mkdirSync").mockImplementation(() => {
      throw new Error("boom");
    });
    expect(kisoFs.mkdir("/any")).toStrictEqualLeft({
      type: "unexpected_error",
      message: "Error: boom",
    });
    vi.spyOn(fs, "rmSync").mockImplementation(() => {
      throw new Error("boom");
    });
    expect(kisoFs.rm("/any")).toStrictEqualLeft({
      type: "unexpected_error",
      message: "Error: boom",
    });
  });

  it("非ErrorのthrowはJSON.stringifyしてunexpected_errorになる", () => {
    vi.spyOn(fs, "readFileSync").mockImplementation(() => {
      throw { reason: "disk gone" };
    });
    expect(kisoFs.readFile("/any")).toStrictEqualLeft({
      type: "unexpected_error",
      message: '{"reason":"disk gone"}',
    });
    vi.spyOn(fs, "writeFileSync").mockImplementation(() => {
      throw { reason: "disk gone" };
    });
    expect(kisoFs.writeFile("/any", "x")).toStrictEqualLeft({
      type: "unexpected_error",
      message: '{"reason":"disk gone"}',
    });
  });
});
