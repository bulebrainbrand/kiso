import fs from "node:fs";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { Storage } from "./storage.ts";

type TestStore = {
  name: string;
  count: number;
  flag: boolean;
  nothing: null;
};

const tmpRoots: string[] = [];

const makeTempRoot = (): string => {
  const dir = mkdtempSync(join(tmpdir(), "kiso-storage-"));
  tmpRoots.push(dir);
  return dir;
};

const storageFile = (root: string, name = "store"): string =>
  join(root, `${name}.json`);

afterEach(() => {
  vi.restoreAllMocks();
  while (tmpRoots.length > 0) {
    const dir = tmpRoots.pop();
    if (dir) rmSync(dir, { recursive: true, force: true });
  }
});

const codeError = (code: string, message = code): NodeJS.ErrnoException =>
  Object.assign(new Error(message), { code });

describe("Storage constructor", () => {
  it("ファイル不存在でもthrowしない", () => {
    const root = makeTempRoot();
    expect(() => new Storage<TestStore>("store", root)).not.toThrow();
  });

  it("ファイル存在時もthrowしない", () => {
    const root = makeTempRoot();
    const storage = new Storage<TestStore>("store", root);
    expect(storage.setItem("name", "a")).toBeRight();
    expect(() => new Storage<TestStore>("store", root)).not.toThrow();
  });

  it("同名パスがディレクトリならTypeErrorをthrowする", () => {
    const root = makeTempRoot();
    fs.mkdirSync(storageFile(root));
    expect(() => new Storage<TestStore>("store", root)).toThrow(TypeError);
  });
});

describe("Storage getItem/setItem", () => {
  it("setした値をgetで読める(全プリミティブ)", () => {
    const root = makeTempRoot();
    const storage = new Storage<TestStore>("store", root);
    expect(storage.setItem("name", "hello")).toBeRight();
    expect(storage.setItem("count", 42)).toBeRight();
    expect(storage.setItem("flag", true)).toBeRight();
    expect(storage.setItem("nothing", null)).toBeRight();

    expect(storage.getItem("name")).toBeRight("hello");
    expect(storage.getItem("count")).toBeRight(42);
    expect(storage.getItem("flag")).toBeRight(true);
    // null値は欠損と同様にnullとして返る
    expect(storage.getItem("nothing")).toBeRight(null);
  });

  it("ファイル不存在のgetItemはRight(null)", () => {
    const root = makeTempRoot();
    const storage = new Storage<TestStore>("store", root);
    expect(storage.getItem("name")).toBeRight(null);
  });

  it("未設定キーのgetItemはRight(null)", () => {
    const root = makeTempRoot();
    const storage = new Storage<TestStore>("store", root);
    expect(storage.setItem("name", "a")).toBeRight();
    expect(storage.getItem("count")).toBeRight(null);
  });

  it("setItemは既存キーを保持してマージする", () => {
    const root = makeTempRoot();
    const storage = new Storage<TestStore>("store", root);
    expect(storage.setItem("name", "a")).toBeRight();
    expect(storage.setItem("count", 1)).toBeRight();
    const raw = JSON.parse(fs.readFileSync(storageFile(root), "utf-8"));
    expect(raw).toEqual({ name: "a", count: 1 });
  });

  it("同キーのsetItemは上書きする", () => {
    const root = makeTempRoot();
    const storage = new Storage<TestStore>("store", root);
    expect(storage.setItem("name", "old")).toBeRight();
    expect(storage.setItem("name", "new")).toBeRight();
    expect(storage.getItem("name")).toBeRight("new");
    const raw = JSON.parse(fs.readFileSync(storageFile(root), "utf-8"));
    expect(raw).toEqual({ name: "new" });
  });

  it("別インスタンスから永続化した値を読める", () => {
    const root = makeTempRoot();
    const first = new Storage<TestStore>("store", root);
    expect(first.setItem("name", "saved")).toBeRight();
    const second = new Storage<TestStore>("store", root);
    expect(second.getItem("name")).toBeRight("saved");
  });

  it("存在しないdirでもsetItemで再帰作成される", () => {
    const root = makeTempRoot();
    const nested = join(root, "a", "b");
    const storage = new Storage<TestStore>("store", nested);
    expect(storage.setItem("name", "x")).toBeRight();
    expect(storage.getItem("name")).toBeRight("x");
  });
});

describe("Storage 読み取りエラー", () => {
  it("壊れたJSONはparse_error", () => {
    const root = makeTempRoot();
    fs.writeFileSync(storageFile(root), "{broken");
    const storage = new Storage<TestStore>("store", root);
    expect(storage.getItem("name")).toBeLeftWith(
      (e) => e.type === "parse_error",
    );
    expect(storage.setItem("name", "x")).toBeLeftWith(
      (e) => e.type === "parse_error",
    );
    expect(storage.removeItem("name")).toBeLeftWith(
      (e) => e.type === "parse_error",
    );
  });

  it("スキーマ違反のJSONはparse_error(ネスト/配列値/トップレベル非オブジェクト)", () => {
    const cases = [
      `{"name":{"nested":1}}`,
      `{"name":["a"]}`,
      `[{"a":1}]`,
      `"just-string"`,
      `123`,
    ];
    for (const body of cases) {
      const root = makeTempRoot();
      fs.writeFileSync(storageFile(root), body);
      const storage = new Storage<TestStore>("store", root);
      expect(storage.getItem("name")).toBeLeftWith(
        (e) => e.type === "parse_error",
      );
    }
  });

  it("ディレクトリを読みに行くとread_error(EISDIR)", () => {
    const root = makeTempRoot();
    fs.mkdirSync(storageFile(root));
    // constructor自体はstatで弾かれるため、別名で作ってから置換するのではなく
    // read経路単体を確認するため、一旦ファイル→ディレクトリに置き換える
    const root2 = makeTempRoot();
    const storage = new Storage<TestStore>("store", root2);
    fs.mkdirSync(join(root2, "sub"));
    fs.writeFileSync(join(root2, "sub.json"), "{}");
    expect(storage.setItem("name", "x")).toBeRight();
    // 実FS由来のread_errorはモックでも確認する
    vi.spyOn(fs, "readFileSync").mockImplementation(() => {
      throw codeError("EISDIR", "illegal operation on a directory");
    });
    expect(storage.getItem("name")).toBeLeftWith(
      (e) => e.type === "read_error" && e.code === "EISDIR",
    );
  });

  it("code付きread失敗はread_errorとして伝播する", () => {
    const root = makeTempRoot();
    const storage = new Storage<TestStore>("store", root);
    expect(storage.setItem("name", "x")).toBeRight();
    vi.spyOn(fs, "readFileSync").mockImplementation(() => {
      throw codeError("EACCES", "permission denied");
    });
    for (const result of [
      storage.getItem("name"),
      storage.setItem("name", "y"),
      storage.removeItem("name"),
    ]) {
      expect(result).toBeLeftWith(
        (e) => e.type === "read_error" && e.code === "EACCES",
      );
    }
  });

  it("codeなしErrorのread失敗はunexpected_error", () => {
    const root = makeTempRoot();
    const storage = new Storage<TestStore>("store", root);
    vi.spyOn(fs, "readFileSync").mockImplementation(() => {
      throw new Error("boom");
    });
    expect(storage.getItem("name")).toStrictEqualLeft({
      type: "unexpected_error",
      message: "Error: boom",
    });
  });

  it("非Errorのread失敗はJSON.stringifyしてunexpected_error", () => {
    const root = makeTempRoot();
    const storage = new Storage<TestStore>("store", root);
    vi.spyOn(fs, "readFileSync").mockImplementation(() => {
      throw { reason: "disk gone" };
    });
    expect(storage.getItem("name")).toStrictEqualLeft({
      type: "unexpected_error",
      message: `{"reason":"disk gone"}`,
    });
  });

  it("SyntaxError以外のJSON.parse失敗はunexpected_error", () => {
    const root = makeTempRoot();
    const storage = new Storage<TestStore>("store", root);
    expect(storage.setItem("name", "x")).toBeRight();
    vi.spyOn(JSON, "parse").mockImplementation(() => {
      throw new TypeError("weird");
    });
    expect(storage.getItem("name")).toBeLeftWith(
      (e) => e.type === "unexpected_error",
    );
  });
});

describe("Storage 書き込みエラー", () => {
  it("循環参照のsetItemはstringify_error", () => {
    const root = makeTempRoot();
    const storage = new Storage<TestStore>("store", root);
    const circular: Record<string, unknown> = {};
    circular["self"] = circular;
    expect(storage.setItem("name", circular as unknown as string)).toBeLeftWith(
      (e) => e.type === "stringify_error",
    );
  });

  it("JSON.stringifyの非Error失敗はunexpected_error", () => {
    const root = makeTempRoot();
    const storage = new Storage<TestStore>("store", root);
    vi.spyOn(JSON, "stringify").mockImplementationOnce(() => {
      throw { reason: "bad" };
    });
    expect(storage.setItem("name", "x")).toStrictEqualLeft({
      type: "unexpected_error",
      message: `{"reason":"bad"}`,
    });
  });

  it("実FS: ファイルを親に持つdirへのsetItemはread_error(ENOTDIR)", () => {
    const root = makeTempRoot();
    const blocker = join(root, "blocker");
    fs.writeFileSync(blocker, "x");
    const storage = new Storage<TestStore>("store", join(blocker, "child"));
    expect(storage.setItem("name", "x")).toBeLeftWith(
      (e) => e.type === "read_error" && e.code === "ENOTDIR",
    );
  });

  it("code付きwrite失敗はwrite_errorとして伝播する", () => {
    const root = makeTempRoot();
    const storage = new Storage<TestStore>("store", root);
    vi.spyOn(fs, "writeFileSync").mockImplementationOnce(() => {
      throw codeError("EACCES", "permission denied");
    });
    expect(storage.setItem("name", "x")).toBeLeftWith(
      (e) => e.type === "write_error" && e.code === "EACCES",
    );
    // removeItem経路のwrite失敗も同様
    expect(storage.clear()).toBeRight();
    fs.writeFileSync(storageFile(root), `{"name":"a"}`);
    const fresh = new Storage<TestStore>("store", root);
    vi.spyOn(fs, "writeFileSync").mockImplementationOnce(() => {
      throw codeError("EACCES", "permission denied");
    });
    expect(fresh.removeItem("name")).toBeLeftWith(
      (e) => e.type === "write_error",
    );
  });

  it("codeなしErrorのwrite失敗はunexpected_error", () => {
    const root = makeTempRoot();
    const storage = new Storage<TestStore>("store", root);
    vi.spyOn(fs, "writeFileSync").mockImplementation(() => {
      throw new Error("boom");
    });
    expect(storage.setItem("name", "x")).toStrictEqualLeft({
      type: "unexpected_error",
      message: "Error: boom",
    });
  });

  it("非Errorのwrite失敗はJSON.stringifyしてunexpected_error", () => {
    const root = makeTempRoot();
    const storage = new Storage<TestStore>("store", root);
    vi.spyOn(fs, "writeFileSync").mockImplementation(() => {
      throw { reason: "disk gone" };
    });
    expect(storage.setItem("name", "x")).toStrictEqualLeft({
      type: "unexpected_error",
      message: `{"reason":"disk gone"}`,
    });
  });

  it("mkdir失敗もwrite_errorとして伝播する", () => {
    const root = makeTempRoot();
    const storage = new Storage<TestStore>("store", join(root, "new-dir"));
    vi.spyOn(fs, "mkdirSync").mockImplementation(() => {
      throw codeError("EACCES", "permission denied");
    });
    expect(storage.setItem("name", "x")).toBeLeftWith(
      (e) => e.type === "write_error",
    );
  });
});

describe("Storage removeItem", () => {
  it("ファイル不存在のremoveItemはRight(undefined)", () => {
    const root = makeTempRoot();
    const storage = new Storage<TestStore>("store", root);
    expect(storage.removeItem("name")).toBeRight();
  });

  it("存在キーを削除し他キーを残す", () => {
    const root = makeTempRoot();
    const storage = new Storage<TestStore>("store", root);
    expect(storage.setItem("name", "a")).toBeRight();
    expect(storage.setItem("count", 1)).toBeRight();
    expect(storage.removeItem("name")).toBeRight();
    expect(storage.getItem("name")).toBeRight(null);
    expect(storage.getItem("count")).toBeRight(1);
    const raw = JSON.parse(fs.readFileSync(storageFile(root), "utf-8"));
    expect(raw).toEqual({ count: 1 });
  });

  it("不存在キーのremoveItemは書き込まずRight", () => {
    const root = makeTempRoot();
    const storage = new Storage<TestStore>("store", root);
    expect(storage.setItem("name", "a")).toBeRight();
    const spy = vi.spyOn(fs, "writeFileSync");
    expect(storage.removeItem("count")).toBeRight();
    expect(spy).not.toHaveBeenCalled();
    const raw = JSON.parse(fs.readFileSync(storageFile(root), "utf-8"));
    expect(raw).toEqual({ name: "a" });
  });
});

describe("Storage clear", () => {
  it("ファイル不存在のclearはRight(undefined)", () => {
    const root = makeTempRoot();
    const storage = new Storage<TestStore>("store", root);
    expect(storage.clear()).toBeRight();
  });

  it("clearはファイルを削除しgetItemはnullに戻る", () => {
    const root = makeTempRoot();
    const storage = new Storage<TestStore>("store", root);
    expect(storage.setItem("name", "a")).toBeRight();
    expect(fs.existsSync(storageFile(root))).toBe(true);
    expect(storage.clear()).toBeRight();
    expect(fs.existsSync(storageFile(root))).toBe(false);
    expect(storage.getItem("name")).toBeRight(null);
  });

  it("clear後のsetItemで再作成できる", () => {
    const root = makeTempRoot();
    const storage = new Storage<TestStore>("store", root);
    expect(storage.setItem("name", "a")).toBeRight();
    expect(storage.clear()).toBeRight();
    expect(storage.setItem("name", "b")).toBeRight();
    expect(storage.getItem("name")).toBeRight("b");
  });

  it("削除直前のENOENTはRight扱いになる", () => {
    const root = makeTempRoot();
    const storage = new Storage<TestStore>("store", root);
    expect(storage.setItem("name", "a")).toBeRight();
    vi.spyOn(fs, "rmSync").mockImplementation(() => {
      throw codeError("ENOENT", "gone");
    });
    expect(storage.clear()).toBeRight();
  });

  it("code付きrm失敗はwrite_error", () => {
    const root = makeTempRoot();
    const storage = new Storage<TestStore>("store", root);
    expect(storage.setItem("name", "a")).toBeRight();
    vi.spyOn(fs, "rmSync").mockImplementation(() => {
      throw codeError("EACCES", "permission denied");
    });
    expect(storage.clear()).toBeLeftWith(
      (e) => e.type === "write_error" && e.code === "EACCES",
    );
  });

  it("codeなしErrorのrm失敗はunexpected_error", () => {
    const root = makeTempRoot();
    const storage = new Storage<TestStore>("store", root);
    expect(storage.setItem("name", "a")).toBeRight();
    vi.spyOn(fs, "rmSync").mockImplementation(() => {
      throw new Error("boom");
    });
    expect(storage.clear()).toStrictEqualLeft({
      type: "unexpected_error",
      message: "Error: boom",
    });
  });

  it("非Errorのrm失敗はJSON.stringifyしてunexpected_error", () => {
    const root = makeTempRoot();
    const storage = new Storage<TestStore>("store", root);
    expect(storage.setItem("name", "a")).toBeRight();
    vi.spyOn(fs, "rmSync").mockImplementation(() => {
      throw { reason: "disk gone" };
    });
    expect(storage.clear()).toStrictEqualLeft({
      type: "unexpected_error",
      message: `{"reason":"disk gone"}`,
    });
  });
});
