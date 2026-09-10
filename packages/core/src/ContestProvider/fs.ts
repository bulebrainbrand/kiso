import fs from "node:fs";
import path from "node:path";

import type { FsContext, FsError, FsStat } from "@kiso/types";
import * as E from "fp-ts/Either";
import { pipe } from "fp-ts/function";

export class KisoFs implements FsContext {
  readonly rootDir: string;
  constructor(rootDir: string) {
    if (!path.isAbsolute(rootDir)) {
      throw new TypeError(`rootDir must be an absolute path: ${rootDir}`);
    }
    this.rootDir = rootDir;
  }
  private toReadError(error: unknown): FsError {
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
  }
  private toWriteError(error: unknown): FsError {
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
  }
  exists(target: string): boolean {
    return fs.existsSync(target);
  }
  stat(target: string): E.Either<FsError, FsStat> {
    return pipe(
      E.tryCatch(
        () => fs.statSync(target),
        (error) => this.toReadError(error),
      ),
      E.map((stats) => ({
        isFile: stats.isFile(),
        isDirectory: stats.isDirectory(),
      })),
    );
  }
  readFile(target: string): E.Either<FsError, string> {
    return E.tryCatch(
      () => fs.readFileSync(target, "utf-8"),
      (error) => this.toReadError(error),
    );
  }
  writeFile(target: string, content: string): E.Either<FsError, void> {
    return E.tryCatch(
      () => {
        fs.writeFileSync(target, content, "utf-8");
      },
      (error) => this.toWriteError(error),
    );
  }
  mkdir(target: string): E.Either<FsError, void> {
    return E.tryCatch(
      () => {
        fs.mkdirSync(target, { recursive: true });
      },
      (error) => this.toWriteError(error),
    );
  }
  rm(target: string): E.Either<FsError, void> {
    return E.tryCatch(
      () => {
        fs.rmSync(target, { recursive: true, force: true });
      },
      (error) => this.toWriteError(error),
    );
  }
}
