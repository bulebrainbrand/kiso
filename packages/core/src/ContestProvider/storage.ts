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
import { Err, Ok, type Result } from "neverthrow";
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
  ): Result<S[K] | null, FileReadError | JSONParseError | UnexpectedError> {
    const result = this.readJSON();
    if (result.isErr()) {
      const error = result.error;
      if (error.type === "read_error" && error.code === "ENOENT") {
        return new Ok(null);
      }
      return new Err(error);
    }
    const value = result.value[String(keyName)] ?? null;
    return new Ok(value as S[K] | null);
  }
  setItem<K extends keyof S>(
    keyName: K,
    keyValue: S[K],
  ): Result<
    void,
    | FileWriteError
    | FileReadError
    | JSONParseError
    | JSONStringifyError
    | UnexpectedError
  > {
    const result = this.readJSON();
    let obj: Partial<Record<string, JSONPrimitive>>;
    if (result.isErr()) {
      const error = result.error;
      if (error.type === "read_error" && error.code === "ENOENT") {
        obj = {};
      } else {
        return new Err(error);
      }
    } else {
      obj = result.value;
    }
    obj[String(keyName)] = keyValue;
    return this.writeJSON(obj);
  }
  removeItem<K extends keyof S>(
    keyName: K,
  ): Result<
    void,
    | FileWriteError
    | FileReadError
    | JSONParseError
    | JSONStringifyError
    | UnexpectedError
  > {
    const result = this.readJSON();
    if (result.isErr()) {
      const error = result.error;
      if (error.type === "read_error" && error.code === "ENOENT") {
        return new Ok(undefined);
      }
      return new Err(error);
    }
    const obj = result.value;
    if (!(String(keyName) in obj)) {
      return new Ok(undefined);
    }
    delete obj[String(keyName)];
    return this.writeJSON(obj);
  }
  clear(): Result<void, FileWriteError | UnexpectedError> {
    const storagePath = this.createStorageFilePath();
    try {
      if (!fs.existsSync(storagePath)) {
        return new Ok(undefined);
      }
      fs.rmSync(storagePath);
      return new Ok(undefined);
    } catch (error) {
      if (error instanceof Error) {
        if ("code" in error && typeof error.code === "string") {
          if (error.code === "ENOENT") {
            return new Ok(undefined);
          }
          return new Err({
            type: "write_error",
            message: error.message,
            code: error.code,
          });
        }
        return new Err({ type: "unexpected_error", message: String(error) });
      }
      return new Err({
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
  private readJSON(): Result<
    Partial<Record<string, JSONPrimitive>>,
    FileReadError | JSONParseError | UnexpectedError
  > {
    return this.readFile()
      .andThen((content) => this.parseJSON(content))
      .andThen((obj) => this.parseUnknownJSON(obj));
  }
  private readFile(): Result<string, FileReadError | UnexpectedError> {
    try {
      return new Ok(fs.readFileSync(this.createStorageFilePath()).toString());
    } catch (error) {
      if (error instanceof Error) {
        if ("code" in error && typeof error.code === "string") {
          // fs read error (ENOENT, EACCES, EISDIR, ...)
          return new Err({
            type: "read_error",
            message: error.message,
            code: error.code,
          });
        }
        return new Err({ type: "unexpected_error", message: String(error) });
      }
      return new Err({
        type: "unexpected_error",
        message: JSON.stringify(error),
      });
    }
  }
  private writeJSON(
    obj: Partial<Record<string, JSONPrimitive>>,
  ): Result<void, FileWriteError | JSONStringifyError | UnexpectedError> {
    return this.stringifyJSON(obj).andThen((content) =>
      this.writeFile(content),
    );
  }
  private stringifyJSON(
    obj: Partial<Record<string, JSONPrimitive>>,
  ): Result<string, JSONStringifyError | UnexpectedError> {
    try {
      return new Ok(JSON.stringify(obj));
    } catch (error) {
      if (error instanceof Error) {
        return new Err({ type: "stringify_error", message: error.message });
      }
      return new Err({
        type: "unexpected_error",
        message: JSON.stringify(error),
      });
    }
  }
  private writeFile(
    content: string,
  ): Result<void, FileWriteError | UnexpectedError> {
    try {
      fs.mkdirSync(this.dir, { recursive: true });
      fs.writeFileSync(this.createStorageFilePath(), content);
      return new Ok(undefined);
    } catch (error) {
      if (error instanceof Error) {
        if ("code" in error && typeof error.code === "string") {
          return new Err({
            type: "write_error",
            message: error.message,
            code: error.code,
          });
        }
        return new Err({ type: "unexpected_error", message: String(error) });
      }
      return new Err({
        type: "unexpected_error",
        message: JSON.stringify(error),
      });
    }
  }
  private parseJSON(
    str: string,
  ): Result<unknown, JSONParseError | UnexpectedError> {
    try {
      return JSON.parse(str);
    } catch (error) {
      if (error instanceof SyntaxError) {
        return new Err({ type: "parse_error", message: String(error) });
      }
      return new Err({
        type: "unexpected_error",
        message: JSON.stringify(error),
      });
    }
  }
  private parseUnknownJSON(
    obj: unknown,
  ): Result<Partial<Record<string, JSONPrimitive>>, JSONParseError> {
    const schema = v.record(
      v.string(),
      v.union([v.string(), v.number(), v.boolean(), v.null()]),
    );
    const result = v.safeParse(schema, obj);
    if (result.success) {
      return new Ok(result.output);
    }
    return new Err({
      type: "parse_error",
      message: result.issues.map((issue) => issue.message).join("\n"),
    });
  }
}
