import { existsSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

import * as E from "fp-ts/Either";

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
): E.Either<FindConfigNotFoundError | FindConfigIsDirectoryError, string> => {
  let dir = resolve(cwd);
  while (true) {
    const candidate = join(dir, KISO_CONFIG_FILE_NAME);
    if (existsSync(candidate)) {
      if (statSync(candidate).isFile()) return E.right(candidate);
      return E.left({ type: "is_directory", path: candidate });
    }
    const parent = dirname(dir);
    if (parent === dir) return E.left({ type: "not_found" });
    dir = parent;
  }
};
