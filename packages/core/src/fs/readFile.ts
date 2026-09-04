import { fromThrowable } from "neverthrow";
import type { FS } from "../types/fs.ts";

type ReadFileSafeError = {
  type: "read_error";
  error: unknown;
};

export const readFileSafe = fromThrowable(
  (path: string, fs: FS) => {
    return fs.readFileSync(path).toString();
  },
  (e): ReadFileSafeError => {
    return { type: "read_error", error: e };
  },
);
