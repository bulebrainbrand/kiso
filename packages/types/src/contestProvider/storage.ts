import type { Result } from "neverthrow";

export type JSONPrimitive = string | number | boolean | null;
export type StorageType<T extends Record<string, JSONPrimitive> = Record<string, JSONPrimitive>> =
  T;

export type FileReadError = { type: "read_error"; message: string };

export type FileWriteError = { type: "write_error"; message: string };

export type JSONParseError = { type: "parse_error"; message: string };

export type JSONStringifyError = { type: "stringify_error"; message: string };

export type StorageContext<T extends StorageType> = {
  getItem<K extends keyof T>(keyName: K): Result<T[K] | null, FileReadError | JSONParseError>;
  setItem<K extends keyof T>(
    keyName: K,
    keyValue: T[K],
  ): Result<void, FileWriteError | FileReadError | JSONParseError | JSONStringifyError>;
  removeItem<K extends keyof T>(
    keyName: K,
  ): Result<void, FileWriteError | FileReadError | JSONParseError | JSONStringifyError>;
  clear(): Result<void, FileWriteError>;
};
