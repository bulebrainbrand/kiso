import type * as E from "fp-ts/Either";

export type JSONPrimitive = string | number | boolean | null;
export type StorageType<
  T extends Record<string, JSONPrimitive> = Record<string, JSONPrimitive>,
> = T;

export type FileReadError = {
  type: "read_error";
  message: string;
  code: string | undefined;
};

export type FileWriteError = {
  type: "write_error";
  message: string;
  code: string | undefined;
};

export type JSONParseError = { type: "parse_error"; message: string };

export type JSONStringifyError = { type: "stringify_error"; message: string };
export type UnexpectedError = { type: "unexpected_error"; message: unknown };

export type StorageError =
  | FileReadError
  | FileWriteError
  | JSONParseError
  | JSONStringifyError
  | UnexpectedError;

export type StorageContext<T extends StorageType> = {
  getItem<K extends keyof T>(
    keyName: K,
  ): E.Either<FileReadError | JSONParseError | UnexpectedError, T[K] | null>;
  setItem<K extends keyof T>(
    keyName: K,
    keyValue: T[K],
  ): E.Either<
    | FileWriteError
    | FileReadError
    | JSONParseError
    | JSONStringifyError
    | UnexpectedError,
    void
  >;
  removeItem<K extends keyof T>(
    keyName: K,
  ): E.Either<
    | FileWriteError
    | FileReadError
    | JSONParseError
    | JSONStringifyError
    | UnexpectedError,
    void
  >;
  clear(): E.Either<FileWriteError | UnexpectedError, void>;
};
