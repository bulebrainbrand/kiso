import fs from "node:fs";

import type { FsContext, FsError } from "@kiso/types";
import { Result } from "neverthrow";

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

const safeStat = Result.fromThrowable(
  (path: string) => fs.statSync(path),
  toReadError,
);
const safeReadFile = Result.fromThrowable(
  (path: string) => fs.readFileSync(path, "utf-8"),
  toReadError,
);
const safeWriteFile = Result.fromThrowable(
  (path: string, content: string): void => {
    fs.writeFileSync(path, content, "utf-8");
  },
  toWriteError,
);
const safeMkdir = Result.fromThrowable((path: string): void => {
  fs.mkdirSync(path, { recursive: true });
}, toWriteError);
const safeRm = Result.fromThrowable((path: string): void => {
  fs.rmSync(path, { recursive: true, force: true });
}, toWriteError);

export const kisoFs: FsContext = {
  exists: (path) => fs.existsSync(path),
  stat: (path) =>
    safeStat(path).map((stats) => ({
      isFile: stats.isFile(),
      isDirectory: stats.isDirectory(),
    })),
  readFile: (path) => safeReadFile(path),
  writeFile: (path, content) => safeWriteFile(path, content),
  mkdir: (path) => safeMkdir(path),
  rm: (path) => safeRm(path),
};
