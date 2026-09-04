import { err, ok } from "neverthrow";
import type { Result } from "neverthrow";
import { dirname, join, resolve } from "node:path";
import { KISO_CONFIG_FILE_NAME } from "../constants.ts";
import type { FS } from "../types/fs.ts";
export type FindConfigNotFoundError = {
  type: "not_found";
};
export const findConfig = (fs: FS, cwd: string): Result<string, FindConfigNotFoundError> => {
  let dir = resolve(cwd);
  while (true) {
    if (fs.existsSync(join(dir, KISO_CONFIG_FILE_NAME))) {
      return ok(join(dir, KISO_CONFIG_FILE_NAME));
    }
    const parent = dirname(dir);
    if (parent === dir) return err({ type: "not_found" });
    dir = parent;
  }
};
