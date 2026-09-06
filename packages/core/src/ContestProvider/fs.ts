import fs from "node:fs";

import type { FsContext, FsError } from "@kiso/types";
import * as E from "fp-ts/Either";
import { pipe } from "fp-ts/function";

const toReadError = (error: unknown): FsError => {
  if (error instanceof Error) {
    if ("code" in error && typeof error.code === "string") {
      return {
        type: "read_error",
        message: error.message,
        code: error.code,
      };
    }
    return { type: "unexpected_error", message: String(error) };
  }
  return { type: "unexpected_error", message: JSON.stringify(error) };
};

const toWriteError = (error: unknown): FsError => {
  if (error instanceof Error) {
    if ("code" in error && typeof error.code === "string") {
      return {
        type: "write_error",
        message: error.message,
        code: error.code,
      };
    }
    return { type: "unexpected_error", message: String(error) };
  }
  return { type: "unexpected_error", message: JSON.stringify(error) };
};

const safeStat = (path: string) =>
  E.tryCatch(() => fs.statSync(path), toReadError);
const safeReadFile = (path: string) =>
  E.tryCatch(() => fs.readFileSync(path, "utf-8"), toReadError);
const safeWriteFile = (
  path: string,
  content: string,
): E.Either<FsError, void> =>
  E.tryCatch(() => {
    fs.writeFileSync(path, content, "utf-8");
  }, toWriteError);
const safeMkdir = (path: string): E.Either<FsError, void> =>
  E.tryCatch(() => {
    fs.mkdirSync(path, { recursive: true });
  }, toWriteError);
const safeRm = (path: string): E.Either<FsError, void> =>
  E.tryCatch(() => {
    fs.rmSync(path, { recursive: true, force: true });
  }, toWriteError);

export const kisoFs: FsContext = {
  exists: (path) => fs.existsSync(path),
  stat: (path) =>
    pipe(
      safeStat(path),
      E.map((stats) => ({
        isFile: stats.isFile(),
        isDirectory: stats.isDirectory(),
      })),
    ),
  readFile: (path) => safeReadFile(path),
  writeFile: (path, content) => safeWriteFile(path, content),
  mkdir: (path) => safeMkdir(path),
  rm: (path) => safeRm(path),
};
