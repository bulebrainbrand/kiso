import fs from "fs";
import path from "path";

import type {
  FileReadError,
  FileWriteError,
  JSONParseError,
  JSONPrimitive,
  JSONStringifyError,
  StorageContext,
  StorageType,
  UnexpectedError,
} from "@kiso/types";
import * as E from "fp-ts/Either";
import { pipe } from "fp-ts/function";
import * as v from "valibot";
export class Storage<S extends StorageType> implements StorageContext<S> {
  constructor(
    private readonly name: string,
    private readonly dir: string,
  ) {
    const storagePath = path.join(dir, this.createFileName());
    if (fs.existsSync(storagePath)) {
      if (fs.statSync(storagePath).isFile()) {
      } else {
        throw new TypeError(
          `${storagePath} is not file. can't parse directory`,
        );
      }
    }
  }
  getItem<K extends keyof S>(
    keyName: K,
  ): E.Either<FileReadError | JSONParseError | UnexpectedError, S[K] | null> {
    const result = this.readJSON();
    if (E.isLeft(result)) {
      const error = result.left;
      if (error.type === "read_error" && error.code === "ENOENT") {
        return E.right(null);
      }
      return E.left(error);
    }
    const value = result.right[String(keyName)] ?? null;
    return E.right(value as S[K] | null);
  }
  setItem<K extends keyof S>(
    keyName: K,
    keyValue: S[K],
  ): E.Either<
    | FileWriteError
    | FileReadError
    | JSONParseError
    | JSONStringifyError
    | UnexpectedError,
    void
  > {
    const result = this.readJSON();
    let obj: Partial<Record<string, JSONPrimitive>>;
    if (E.isLeft(result)) {
      const error = result.left;
      if (error.type === "read_error" && error.code === "ENOENT") {
        obj = {};
      } else {
        return E.left(error);
      }
    } else {
      obj = result.right;
    }
    obj[String(keyName)] = keyValue;
    return this.writeJSON(obj);
  }
  removeItem<K extends keyof S>(
    keyName: K,
  ): E.Either<
    | FileWriteError
    | FileReadError
    | JSONParseError
    | JSONStringifyError
    | UnexpectedError,
    void
  > {
    const result = this.readJSON();
    if (E.isLeft(result)) {
      const error = result.left;
      if (error.type === "read_error" && error.code === "ENOENT") {
        return E.right(undefined);
      }
      return E.left(error);
    }
    const obj = result.right;
    if (!(String(keyName) in obj)) {
      return E.right(undefined);
    }
    delete obj[String(keyName)];
    return this.writeJSON(obj);
  }
  clear(): E.Either<FileWriteError | UnexpectedError, void> {
    const storagePath = this.createStorageFilePath();
    try {
      if (!fs.existsSync(storagePath)) {
        return E.right(undefined);
      }
      fs.rmSync(storagePath);
      return E.right(undefined);
    } catch (error) {
      if (error instanceof Error) {
        if ("code" in error && typeof error.code === "string") {
          if (error.code === "ENOENT") {
            return E.right(undefined);
          }
          return E.left({
            type: "write_error",
            message: error.message,
            code: error.code,
          });
        }
        return E.left({ type: "unexpected_error", message: String(error) });
      }
      return E.left({
        type: "unexpected_error",
        message: JSON.stringify(error),
      });
    }
  }

  private createFileName() {
    return `${this.name}.json`;
  }
  private createStorageFilePath() {
    return path.join(this.dir, this.createFileName());
  }
  private readJSON(): E.Either<
    FileReadError | JSONParseError | UnexpectedError,
    Partial<Record<string, JSONPrimitive>>
  > {
    return pipe(
      this.readFile(),
      E.chainW((content) => this.parseJSON(content)),
      E.chainW((obj) => this.parseUnknownJSON(obj)),
    );
  }
  private readFile(): E.Either<FileReadError | UnexpectedError, string> {
    try {
      return E.right(fs.readFileSync(this.createStorageFilePath()).toString());
    } catch (error) {
      if (error instanceof Error) {
        if ("code" in error && typeof error.code === "string") {
          // fs read error (ENOENT, EACCES, EISDIR, ...)
          return E.left({
            type: "read_error",
            message: error.message,
            code: error.code,
          });
        }
        return E.left({ type: "unexpected_error", message: String(error) });
      }
      return E.left({
        type: "unexpected_error",
        message: JSON.stringify(error),
      });
    }
  }
  private writeJSON(
    obj: Partial<Record<string, JSONPrimitive>>,
  ): E.Either<FileWriteError | JSONStringifyError | UnexpectedError, void> {
    return pipe(
      this.stringifyJSON(obj),
      E.chainW((content) => this.writeFile(content)),
    );
  }
  private stringifyJSON(
    obj: Partial<Record<string, JSONPrimitive>>,
  ): E.Either<JSONStringifyError | UnexpectedError, string> {
    try {
      return E.right(JSON.stringify(obj));
    } catch (error) {
      if (error instanceof Error) {
        return E.left({ type: "stringify_error", message: error.message });
      }
      return E.left({
        type: "unexpected_error",
        message: JSON.stringify(error),
      });
    }
  }
  private writeFile(
    content: string,
  ): E.Either<FileWriteError | UnexpectedError, void> {
    try {
      fs.mkdirSync(this.dir, { recursive: true });
      fs.writeFileSync(this.createStorageFilePath(), content);
      return E.right(undefined);
    } catch (error) {
      if (error instanceof Error) {
        if ("code" in error && typeof error.code === "string") {
          return E.left({
            type: "write_error",
            message: error.message,
            code: error.code,
          });
        }
        return E.left({ type: "unexpected_error", message: String(error) });
      }
      return E.left({
        type: "unexpected_error",
        message: JSON.stringify(error),
      });
    }
  }
  private parseJSON(
    str: string,
  ): E.Either<JSONParseError | UnexpectedError, unknown> {
    try {
      return E.right(JSON.parse(str));
    } catch (error) {
      if (error instanceof SyntaxError) {
        return E.left({ type: "parse_error", message: String(error) });
      }
      return E.left({
        type: "unexpected_error",
        message: JSON.stringify(error),
      });
    }
  }
  private parseUnknownJSON(
    obj: unknown,
  ): E.Either<JSONParseError, Partial<Record<string, JSONPrimitive>>> {
    const schema = v.record(
      v.string(),
      v.union([v.string(), v.number(), v.boolean(), v.null()]),
    );
    const result = v.safeParse(schema, obj);
    if (result.success) {
      return E.right(result.output);
    }
    return E.left({
      type: "parse_error",
      message: result.issues.map((issue) => issue.message).join("\n"),
    });
  }
}
