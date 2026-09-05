import { existsSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

import { err, ok } from "neverthrow";
import type { Result } from "neverthrow";

import { KISO_CONFIG_FILE_NAME } from "../constants.ts";
export type FindConfigNotFoundError = {
  type: "not_found";
};
export type FindConfigIsDirectoryError = {
  type: "is_directory";
  path: string;
};
export const findConfig = (
  cwd: string,
): Result<string, FindConfigNotFoundError | FindConfigIsDirectoryError> => {
  let dir = resolve(cwd);
  while (true) {
    const candidate = join(dir, KISO_CONFIG_FILE_NAME);
    if (existsSync(candidate)) {
      if (statSync(candidate).isFile()) return ok(candidate);
      return err({ type: "is_directory", path: candidate });
    }
    const parent = dirname(dir);
    if (parent === dir) return err({ type: "not_found" });
    dir = parent;
  }
};
