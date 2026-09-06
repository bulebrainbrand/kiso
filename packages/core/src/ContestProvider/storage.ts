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

type StoredObject = Partial<Record<string, JSONPrimitive>>;

const toUnexpectedError = (error: unknown): UnexpectedError =>
  error instanceof Error
    ? { type: "unexpected_error", message: String(error) }
    : { type: "unexpected_error", message: JSON.stringify(error) };

const toReadError = (error: unknown): FileReadError | UnexpectedError => {
  if (
    error instanceof Error
    && "code" in error
    && typeof error.code === "string"
  ) {
    // fs read error (ENOENT, EACCES, EISDIR, ...)
    return { type: "read_error", message: error.message, code: error.code };
  }
  return toUnexpectedError(error);
};

const toWriteError = (error: unknown): FileWriteError | UnexpectedError => {
  if (
    error instanceof Error
    && "code" in error
    && typeof error.code === "string"
  ) {
    return { type: "write_error", message: error.message, code: error.code };
  }
  return toUnexpectedError(error);
};

const toStringifyError = (
  error: unknown,
): JSONStringifyError | UnexpectedError => {
  if (error instanceof Error) {
    return { type: "stringify_error", message: error.message };
  }
  return toUnexpectedError(error);
};

const toParseError = (error: unknown): JSONParseError | UnexpectedError => {
  if (error instanceof SyntaxError) {
    return { type: "parse_error", message: String(error) };
  }
  return toUnexpectedError(error);
};

const isMissingReadError = (
  error: FileReadError | JSONParseError | UnexpectedError,
): boolean => error.type === "read_error" && error.code === "ENOENT";

const isMissingWriteError = (
  error: FileWriteError | UnexpectedError,
): boolean => error.type === "write_error" && error.code === "ENOENT";

// ENOENTによる読み欠損だけフォールバック値に倒し、それ以外はLeftのまま伝播する
const orMissingReadTo =
  <A>(fallback: A) =>
  (
    error: FileReadError | JSONParseError | UnexpectedError,
  ): E.Either<FileReadError | JSONParseError | UnexpectedError, A> =>
    isMissingReadError(error) ? E.right(fallback) : E.left(error);

export class Storage<S extends StorageType> implements StorageContext<S> {
  constructor(
    private readonly name: string,
    private readonly dir: string,
  ) {
    const storagePath = path.join(dir, this.createFileName());
    if (fs.existsSync(storagePath) && fs.statSync(storagePath).isDirectory()) {
      throw new TypeError(`${storagePath} is not file. can't parse directory`);
    }
  }
  getItem<K extends keyof S>(
    keyName: K,
  ): E.Either<FileReadError | JSONParseError | UnexpectedError, S[K] | null> {
    return pipe(
      this.readJSON(),
      E.orElse(orMissingReadTo<StoredObject>({})),
      E.map((obj) => (obj[String(keyName)] ?? null) as S[K] | null),
    );
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
    return pipe(
      this.readJSON(),
      E.orElse(orMissingReadTo<StoredObject>({})),
      E.chainW((obj) => {
        obj[String(keyName)] = keyValue;
        return this.writeJSON(obj);
      }),
    );
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
    return pipe(
      this.readJSON(),
      E.orElse(orMissingReadTo<StoredObject>({})),
      E.chainW((obj) => {
        if (!(String(keyName) in obj)) {
          return E.right(undefined);
        }
        delete obj[String(keyName)];
        return this.writeJSON(obj);
      }),
    );
  }
  clear(): E.Either<FileWriteError | UnexpectedError, void> {
    const storagePath = this.createStorageFilePath();
    if (!fs.existsSync(storagePath)) {
      return E.right(undefined);
    }
    return pipe(
      E.tryCatch(() => {
        fs.rmSync(storagePath);
      }, toWriteError),
      E.orElse((error) =>
        isMissingWriteError(error) ? E.right(undefined) : E.left(error),
      ),
    );
  }

  private createFileName() {
    return `${this.name}.json`;
  }
  private createStorageFilePath() {
    return path.join(this.dir, this.createFileName());
  }
  private readJSON(): E.Either<
    FileReadError | JSONParseError | UnexpectedError,
    StoredObject
  > {
    return pipe(
      this.readFile(),
      E.chainW((content) => this.parseJSON(content)),
      E.chainW((obj) => this.parseUnknownJSON(obj)),
    );
  }
  private readFile(): E.Either<FileReadError | UnexpectedError, string> {
    return E.tryCatch(
      () => fs.readFileSync(this.createStorageFilePath()).toString(),
      toReadError,
    );
  }
  private writeJSON(
    obj: StoredObject,
  ): E.Either<FileWriteError | JSONStringifyError | UnexpectedError, void> {
    return pipe(
      this.stringifyJSON(obj),
      E.chainW((content) => this.writeFile(content)),
    );
  }
  private stringifyJSON(
    obj: StoredObject,
  ): E.Either<JSONStringifyError | UnexpectedError, string> {
    return E.tryCatch(() => JSON.stringify(obj), toStringifyError);
  }
  private writeFile(
    content: string,
  ): E.Either<FileWriteError | UnexpectedError, void> {
    return E.tryCatch(() => {
      fs.mkdirSync(this.dir, { recursive: true });
      fs.writeFileSync(this.createStorageFilePath(), content);
    }, toWriteError);
  }
  private parseJSON(
    str: string,
  ): E.Either<JSONParseError | UnexpectedError, unknown> {
    return E.tryCatch<JSONParseError | UnexpectedError, unknown>(
      () => JSON.parse(str) as unknown,
      toParseError,
    );
  }
  private parseUnknownJSON(
    obj: unknown,
  ): E.Either<JSONParseError, StoredObject> {
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
