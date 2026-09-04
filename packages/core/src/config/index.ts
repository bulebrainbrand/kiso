import type { FS } from "../types/fs.ts";
import type { Config } from "valibot";
import { findConfig } from "./findConfig.ts";
import { readFileSafe } from "../fs/readFile.ts";

export const readConfig = (cwd: string, fs: FS) =>
  findConfig(fs, cwd).andThen((path) => readFileSafe(path, fs));
