import fs from "node:fs";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import * as E from "fp-ts/Either";
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
    expect(E.isRight(storage.setItem("name", "a"))).toBe(true);
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
    expect(E.isRight(storage.setItem("name", "hello"))).toBe(true);
    expect(E.isRight(storage.setItem("count", 42))).toBe(true);
    expect(E.isRight(storage.setItem("flag", true))).toBe(true);
    expect(E.isRight(storage.setItem("nothing", null))).toBe(true);

    const name = storage.getItem("name");
    const count = storage.getItem("count");
    const flag = storage.getItem("flag");
    const nothing = storage.getItem("nothing");
    if (E.isRight(name)) expect(name.right).toBe("hello");
    else expect.unreachable();
    if (E.isRight(count)) expect(count.right).toBe(42);
    else expect.unreachable();
    if (E.isRight(flag)) expect(flag.right).toBe(true);
    else expect.unreachable();
    // null値は欠損と同様にnullとして返る
    if (E.isRight(nothing)) expect(nothing.right).toBe(null);
    else expect.unreachable();
  });

  it("ファイル不存在のgetItemはRight(null)", () => {
    const root = makeTempRoot();
    const storage = new Storage<TestStore>("store", root);
    const result = storage.getItem("name");
    expect(E.isRight(result)).toBe(true);
    if (E.isRight(result)) expect(result.right).toBe(null);
  });

  it("未設定キーのgetItemはRight(null)", () => {
    const root = makeTempRoot();
    const storage = new Storage<TestStore>("store", root);
    expect(E.isRight(storage.setItem("name", "a"))).toBe(true);
    const result = storage.getItem("count");
    expect(E.isRight(result)).toBe(true);
    if (E.isRight(result)) expect(result.right).toBe(null);
  });

  it("setItemは既存キーを保持してマージする", () => {
    const root = makeTempRoot();
    const storage = new Storage<TestStore>("store", root);
    expect(E.isRight(storage.setItem("name", "a"))).toBe(true);
    expect(E.isRight(storage.setItem("count", 1))).toBe(true);
    const raw = JSON.parse(fs.readFileSync(storageFile(root), "utf-8"));
    expect(raw).toEqual({ name: "a", count: 1 });
  });

  it("同キーのsetItemは上書きする", () => {
    const root = makeTempRoot();
    const storage = new Storage<TestStore>("store", root);
    expect(E.isRight(storage.setItem("name", "old"))).toBe(true);
    expect(E.isRight(storage.setItem("name", "new"))).toBe(true);
    const result = storage.getItem("name");
    if (E.isRight(result)) expect(result.right).toBe("new");
    else expect.unreachable();
    const raw = JSON.parse(fs.readFileSync(storageFile(root), "utf-8"));
    expect(raw).toEqual({ name: "new" });
  });

  it("別インスタンスから永続化した値を読める", () => {
    const root = makeTempRoot();
    const first = new Storage<TestStore>("store", root);
    expect(E.isRight(first.setItem("name", "saved"))).toBe(true);
    const second = new Storage<TestStore>("store", root);
    const result = second.getItem("name");
    if (E.isRight(result)) expect(result.right).toBe("saved");
    else expect.unreachable();
  });

  it("存在しないdirでもsetItemで再帰作成される", () => {
    const root = makeTempRoot();
    const nested = join(root, "a", "b");
    const storage = new Storage<TestStore>("store", nested);
    expect(E.isRight(storage.setItem("name", "x"))).toBe(true);
    const result = storage.getItem("name");
    if (E.isRight(result)) expect(result.right).toBe("x");
    else expect.unreachable();
  });
});

describe("Storage 読み取りエラー", () => {
  it("壊れたJSONはparse_error", () => {
    const root = makeTempRoot();
    fs.writeFileSync(storageFile(root), "{broken");
    const storage = new Storage<TestStore>("store", root);
    const get = storage.getItem("name");
    expect(E.isLeft(get)).toBe(true);
    if (E.isLeft(get)) expect(get.left.type).toBe("parse_error");
    const set = storage.setItem("name", "x");
    expect(E.isLeft(set)).toBe(true);
    if (E.isLeft(set)) expect(set.left.type).toBe("parse_error");
    const remove = storage.removeItem("name");
    expect(E.isLeft(remove)).toBe(true);
    if (E.isLeft(remove)) expect(remove.left.type).toBe("parse_error");
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
      const result = storage.getItem("name");
      expect(E.isLeft(result)).toBe(true);
      if (E.isLeft(result)) expect(result.left.type).toBe("parse_error");
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
    expect(E.isRight(storage.setItem("name", "x"))).toBe(true);
    // 実FS由来のread_errorはモックでも確認する
    vi.spyOn(fs, "readFileSync").mockImplementation(() => {
      throw codeError("EISDIR", "illegal operation on a directory");
    });
    const result = storage.getItem("name");
    expect(E.isLeft(result)).toBe(true);
    if (E.isLeft(result)) {
      expect(result.left.type).toBe("read_error");
      if (result.left.type === "read_error") {
        expect(result.left.code).toBe("EISDIR");
      }
    }
  });

  it("code付きread失敗はread_errorとして伝播する", () => {
    const root = makeTempRoot();
    const storage = new Storage<TestStore>("store", root);
    expect(E.isRight(storage.setItem("name", "x"))).toBe(true);
    vi.spyOn(fs, "readFileSync").mockImplementation(() => {
      throw codeError("EACCES", "permission denied");
    });
    for (const result of [
      storage.getItem("name"),
      storage.setItem("name", "y"),
      storage.removeItem("name"),
    ]) {
      expect(E.isLeft(result)).toBe(true);
      if (E.isLeft(result)) {
        expect(result.left.type).toBe("read_error");
        if (result.left.type === "read_error") {
          expect(result.left.code).toBe("EACCES");
        }
      }
    }
  });

  it("codeなしErrorのread失敗はunexpected_error", () => {
    const root = makeTempRoot();
    const storage = new Storage<TestStore>("store", root);
    vi.spyOn(fs, "readFileSync").mockImplementation(() => {
      throw new Error("boom");
    });
    const result = storage.getItem("name");
    expect(E.isLeft(result)).toBe(true);
    if (E.isLeft(result)) {
      expect(result.left).toStrictEqual({
        type: "unexpected_error",
        message: "Error: boom",
      });
    }
  });

  it("非Errorのread失敗はJSON.stringifyしてunexpected_error", () => {
    const root = makeTempRoot();
    const storage = new Storage<TestStore>("store", root);
    vi.spyOn(fs, "readFileSync").mockImplementation(() => {
      throw { reason: "disk gone" };
    });
    const result = storage.getItem("name");
    expect(E.isLeft(result)).toBe(true);
    if (E.isLeft(result)) {
      expect(result.left).toStrictEqual({
        type: "unexpected_error",
        message: `{"reason":"disk gone"}`,
      });
    }
  });

  it("SyntaxError以外のJSON.parse失敗はunexpected_error", () => {
    const root = makeTempRoot();
    const storage = new Storage<TestStore>("store", root);
    expect(E.isRight(storage.setItem("name", "x"))).toBe(true);
    vi.spyOn(JSON, "parse").mockImplementation(() => {
      throw new TypeError("weird");
    });
    const result = storage.getItem("name");
    expect(E.isLeft(result)).toBe(true);
    if (E.isLeft(result)) expect(result.left.type).toBe("unexpected_error");
  });
});

describe("Storage 書き込みエラー", () => {
  it("循環参照のsetItemはstringify_error", () => {
    const root = makeTempRoot();
    const storage = new Storage<TestStore>("store", root);
    const circular: Record<string, unknown> = {};
    circular["self"] = circular;
    const result = storage.setItem("name", circular as unknown as string);
    expect(E.isLeft(result)).toBe(true);
    if (E.isLeft(result)) expect(result.left.type).toBe("stringify_error");
  });

  it("JSON.stringifyの非Error失敗はunexpected_error", () => {
    const root = makeTempRoot();
    const storage = new Storage<TestStore>("store", root);
    vi.spyOn(JSON, "stringify").mockImplementationOnce(() => {
      throw { reason: "bad" };
    });
    const result = storage.setItem("name", "x");
    expect(E.isLeft(result)).toBe(true);
    if (E.isLeft(result)) {
      expect(result.left).toStrictEqual({
        type: "unexpected_error",
        message: `{"reason":"bad"}`,
      });
    }
  });

  it("実FS: ファイルを親に持つdirへのsetItemはread_error(ENOTDIR)", () => {
    const root = makeTempRoot();
    const blocker = join(root, "blocker");
    fs.writeFileSync(blocker, "x");
    const storage = new Storage<TestStore>("store", join(blocker, "child"));
    const result = storage.setItem("name", "x");
    expect(E.isLeft(result)).toBe(true);
    if (E.isLeft(result)) {
      expect(result.left.type).toBe("read_error");
      if (result.left.type === "read_error") {
        expect(result.left.code).toBe("ENOTDIR");
      }
    }
  });

  it("code付きwrite失敗はwrite_errorとして伝播する", () => {
    const root = makeTempRoot();
    const storage = new Storage<TestStore>("store", root);
    vi.spyOn(fs, "writeFileSync").mockImplementationOnce(() => {
      throw codeError("EACCES", "permission denied");
    });
    const set = storage.setItem("name", "x");
    expect(E.isLeft(set)).toBe(true);
    if (E.isLeft(set)) {
      expect(set.left.type).toBe("write_error");
      if (set.left.type === "write_error") {
        expect(set.left.code).toBe("EACCES");
      }
    }
    // removeItem経路のwrite失敗も同様
    expect(E.isRight(storage.clear())).toBe(true);
    fs.writeFileSync(storageFile(root), `{"name":"a"}`);
    const fresh = new Storage<TestStore>("store", root);
    vi.spyOn(fs, "writeFileSync").mockImplementationOnce(() => {
      throw codeError("EACCES", "permission denied");
    });
    const remove = fresh.removeItem("name");
    expect(E.isLeft(remove)).toBe(true);
    if (E.isLeft(remove)) expect(remove.left.type).toBe("write_error");
  });

  it("codeなしErrorのwrite失敗はunexpected_error", () => {
    const root = makeTempRoot();
    const storage = new Storage<TestStore>("store", root);
    vi.spyOn(fs, "writeFileSync").mockImplementation(() => {
      throw new Error("boom");
    });
    const result = storage.setItem("name", "x");
    expect(E.isLeft(result)).toBe(true);
    if (E.isLeft(result)) {
      expect(result.left).toStrictEqual({
        type: "unexpected_error",
        message: "Error: boom",
      });
    }
  });

  it("非Errorのwrite失敗はJSON.stringifyしてunexpected_error", () => {
    const root = makeTempRoot();
    const storage = new Storage<TestStore>("store", root);
    vi.spyOn(fs, "writeFileSync").mockImplementation(() => {
      throw { reason: "disk gone" };
    });
    const result = storage.setItem("name", "x");
    expect(E.isLeft(result)).toBe(true);
    if (E.isLeft(result)) {
      expect(result.left).toStrictEqual({
        type: "unexpected_error",
        message: `{"reason":"disk gone"}`,
      });
    }
  });

  it("mkdir失敗もwrite_errorとして伝播する", () => {
    const root = makeTempRoot();
    const storage = new Storage<TestStore>("store", join(root, "new-dir"));
    vi.spyOn(fs, "mkdirSync").mockImplementation(() => {
      throw codeError("EACCES", "permission denied");
    });
    const result = storage.setItem("name", "x");
    expect(E.isLeft(result)).toBe(true);
    if (E.isLeft(result)) expect(result.left.type).toBe("write_error");
  });
});

describe("Storage removeItem", () => {
  it("ファイル不存在のremoveItemはRight(undefined)", () => {
    const root = makeTempRoot();
    const storage = new Storage<TestStore>("store", root);
    const result = storage.removeItem("name");
    expect(E.isRight(result)).toBe(true);
  });

  it("存在キーを削除し他キーを残す", () => {
    const root = makeTempRoot();
    const storage = new Storage<TestStore>("store", root);
    expect(E.isRight(storage.setItem("name", "a"))).toBe(true);
    expect(E.isRight(storage.setItem("count", 1))).toBe(true);
    expect(E.isRight(storage.removeItem("name"))).toBe(true);
    const removed = storage.getItem("name");
    if (E.isRight(removed)) expect(removed.right).toBe(null);
    else expect.unreachable();
    const kept = storage.getItem("count");
    if (E.isRight(kept)) expect(kept.right).toBe(1);
    else expect.unreachable();
    const raw = JSON.parse(fs.readFileSync(storageFile(root), "utf-8"));
    expect(raw).toEqual({ count: 1 });
  });

  it("不存在キーのremoveItemは書き込まずRight", () => {
    const root = makeTempRoot();
    const storage = new Storage<TestStore>("store", root);
    expect(E.isRight(storage.setItem("name", "a"))).toBe(true);
    const spy = vi.spyOn(fs, "writeFileSync");
    expect(E.isRight(storage.removeItem("count"))).toBe(true);
    expect(spy).not.toHaveBeenCalled();
    const raw = JSON.parse(fs.readFileSync(storageFile(root), "utf-8"));
    expect(raw).toEqual({ name: "a" });
  });
});

describe("Storage clear", () => {
  it("ファイル不存在のclearはRight(undefined)", () => {
    const root = makeTempRoot();
    const storage = new Storage<TestStore>("store", root);
    const result = storage.clear();
    expect(E.isRight(result)).toBe(true);
  });

  it("clearはファイルを削除しgetItemはnullに戻る", () => {
    const root = makeTempRoot();
    const storage = new Storage<TestStore>("store", root);
    expect(E.isRight(storage.setItem("name", "a"))).toBe(true);
    expect(fs.existsSync(storageFile(root))).toBe(true);
    expect(E.isRight(storage.clear())).toBe(true);
    expect(fs.existsSync(storageFile(root))).toBe(false);
    const result = storage.getItem("name");
    if (E.isRight(result)) expect(result.right).toBe(null);
    else expect.unreachable();
  });

  it("clear後のsetItemで再作成できる", () => {
    const root = makeTempRoot();
    const storage = new Storage<TestStore>("store", root);
    expect(E.isRight(storage.setItem("name", "a"))).toBe(true);
    expect(E.isRight(storage.clear())).toBe(true);
    expect(E.isRight(storage.setItem("name", "b"))).toBe(true);
    const result = storage.getItem("name");
    if (E.isRight(result)) expect(result.right).toBe("b");
    else expect.unreachable();
  });

  it("削除直前のENOENTはRight扱いになる", () => {
    const root = makeTempRoot();
    const storage = new Storage<TestStore>("store", root);
    expect(E.isRight(storage.setItem("name", "a"))).toBe(true);
    vi.spyOn(fs, "rmSync").mockImplementation(() => {
      throw codeError("ENOENT", "gone");
    });
    expect(E.isRight(storage.clear())).toBe(true);
  });

  it("code付きrm失敗はwrite_error", () => {
    const root = makeTempRoot();
    const storage = new Storage<TestStore>("store", root);
    expect(E.isRight(storage.setItem("name", "a"))).toBe(true);
    vi.spyOn(fs, "rmSync").mockImplementation(() => {
      throw codeError("EACCES", "permission denied");
    });
    const result = storage.clear();
    expect(E.isLeft(result)).toBe(true);
    if (E.isLeft(result)) {
      expect(result.left.type).toBe("write_error");
      if (result.left.type === "write_error") {
        expect(result.left.code).toBe("EACCES");
      }
    }
  });

  it("codeなしErrorのrm失敗はunexpected_error", () => {
    const root = makeTempRoot();
    const storage = new Storage<TestStore>("store", root);
    expect(E.isRight(storage.setItem("name", "a"))).toBe(true);
    vi.spyOn(fs, "rmSync").mockImplementation(() => {
      throw new Error("boom");
    });
    const result = storage.clear();
    expect(E.isLeft(result)).toBe(true);
    if (E.isLeft(result)) {
      expect(result.left).toStrictEqual({
        type: "unexpected_error",
        message: "Error: boom",
      });
    }
  });

  it("非Errorのrm失敗はJSON.stringifyしてunexpected_error", () => {
    const root = makeTempRoot();
    const storage = new Storage<TestStore>("store", root);
    expect(E.isRight(storage.setItem("name", "a"))).toBe(true);
    vi.spyOn(fs, "rmSync").mockImplementation(() => {
      throw { reason: "disk gone" };
    });
    const result = storage.clear();
    expect(E.isLeft(result)).toBe(true);
    if (E.isLeft(result)) {
      expect(result.left).toStrictEqual({
        type: "unexpected_error",
        message: `{"reason":"disk gone"}`,
      });
    }
  });
});
