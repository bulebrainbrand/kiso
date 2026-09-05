import fs from "node:fs";

import type { FsContext, FsError, FsStat } from "@kiso/types";
import { Err, Ok, type Result } from "neverthrow";

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

export const kisoFs: FsContext = {
  exists(path: string): boolean {
    return fs.existsSync(path);
  },
  stat(path: string): Result<FsStat, FsError> {
    try {
      const stats = fs.statSync(path);
      return new Ok({
        isFile: stats.isFile(),
        isDirectory: stats.isDirectory(),
      });
    } catch (error) {
      return new Err(toReadError(error));
    }
  },
  readFile(path: string): Result<string, FsError> {
    try {
      return new Ok(fs.readFileSync(path, "utf-8"));
    } catch (error) {
      return new Err(toReadError(error));
    }
  },
  writeFile(path: string, content: string): Result<void, FsError> {
    try {
      fs.writeFileSync(path, content, "utf-8");
      return new Ok(undefined);
    } catch (error) {
      return new Err(toWriteError(error));
    }
  },
  mkdir(path: string): Result<void, FsError> {
    try {
      fs.mkdirSync(path, { recursive: true });
      return new Ok(undefined);
    } catch (error) {
      return new Err(toWriteError(error));
    }
  },
  rm(path: string): Result<void, FsError> {
    try {
      fs.rmSync(path, { recursive: true, force: true });
      return new Ok(undefined);
    } catch (error) {
      return new Err(toWriteError(error));
    }
  },
};
