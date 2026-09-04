import { err, ok } from "neverthrow";
import type { Result } from "neverthrow";
import { dirname, join, resolve } from "node:path";
import { KISO_CONFIG_FILE_NAME } from "../constants.ts";
import type { FS } from "../types/fs.ts";
export type FindConfigNotFoundError = {
  type: "not_found";
};
export type FindConfigIsDirectoryError = {
  type: "is_directory";
  path: string;
};
export type FindConfigStatError = {
  type: "stat_error";
  path: string;
  cause: unknown;
};
export const findConfig = (
  fs: FS,
  cwd: string,
): Result<string, FindConfigNotFoundError | FindConfigIsDirectoryError | FindConfigStatError> => {
  let dir = resolve(cwd);
  while (true) {
    const candidate = join(dir, KISO_CONFIG_FILE_NAME);
    if (fs.existsSync(candidate)) {
      let stat: ReturnType<FS["statSync"]>;
      try {
        stat = fs.statSync(candidate);
      } catch (e) {
        return err({ type: "stat_error", path: candidate, cause: e });
      }
      if (stat.isFile()) return ok(candidate);
      return err({ type: "is_directory", path: candidate });
    }
    const parent = dirname(dir);
    if (parent === dir) return err({ type: "not_found" });
    dir = parent;
  }
};
