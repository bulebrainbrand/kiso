import * as v from "valibot";

import type { ContestProvider } from "./provider.ts";

// 簡易ガード: nameがstringであることのみ確認する。メソッド存在までは見ない。
export const isContestProvider = (input: unknown): input is ContestProvider =>
  typeof input === "object"
  && input !== null
  && "name" in input
  && typeof (input as { name: unknown }).name === "string";

export const contestProviderSchema = v.custom<ContestProvider>(
  (input) => isContestProvider(input),
  "Invalid ContestProvider",
);
