import type { ContestProvider } from "@kiso/types";
import * as TE from "fp-ts/TaskEither";

import { createCtxFromProvider } from "../../ContestProvider/createCtxFromProvider.ts";
import { isURL } from "./isUrl.ts";
export type ContestIdParseError = {
  type: "contest_id_parse_error";
  input: string;
  provider: string;
};
export const resolveContestId = (
  provider: ContestProvider,
  input: string,
): TE.TaskEither<ContestIdParseError, string> => {
  if (!isURL(input)) return TE.right(input);
  return TE.fromTaskOption<ContestIdParseError>(() => ({
    type: "contest_id_parse_error",
    input,
    provider: provider.name,
  }))(provider.parseContestIdFromUrl(createCtxFromProvider(provider), input));
};
