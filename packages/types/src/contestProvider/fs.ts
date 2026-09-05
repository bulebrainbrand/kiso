import type { Result } from "neverthrow";

import type {
  FileReadError,
  FileWriteError,
  UnexpectedError,
} from "./storage.ts";

export type FsError = FileReadError | FileWriteError | UnexpectedError;

export type FsStat = {
  isFile: boolean;
  isDirectory: boolean;
};

export type FsContext = {
  exists(path: string): boolean;
  stat(path: string): Result<FsStat, FsError>;
  readFile(path: string): Result<string, FsError>;
  writeFile(path: string, content: string): Result<void, FsError>;
  mkdir(path: string): Result<void, FsError>;
  rm(path: string): Result<void, FsError>;
};
