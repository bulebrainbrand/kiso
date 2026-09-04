import { createJiti as createJitiImpl } from "jiti";
import type { Jiti, JitiOptions } from "jiti";

export const createConfigJiti = (options?: JitiOptions): Jiti =>
  createJitiImpl(import.meta.url, {
    fsCache: true,
    moduleCache: true,
    ...options,
  });
