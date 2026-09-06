import type * as E from "fp-ts/Either";

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
  stat(path: string): E.Either<FsError, FsStat>;
  readFile(path: string): E.Either<FsError, string>;
  writeFile(path: string, content: string): E.Either<FsError, void>;
  mkdir(path: string): E.Either<FsError, void>;
  rm(path: string): E.Either<FsError, void>;
};
