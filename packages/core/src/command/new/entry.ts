import { pipe } from "fp-ts/function";
import * as TE from "fp-ts/lib/TaskEither.js";

import { readConfig, type ReadConfigError } from "../../config/index.ts";

type NewCommandInput = {
  id: string;
  languages?: string[];
  provider?: string;
};
export const executeNewCommand = (
  input: NewCommandInput,
  cwd: string,
  // @ts-ignore
): TE.TaskEither<ReadConfigError, void> => {
  pipe(
    readConfig(cwd),
    // @ts-ignore TODO
    TE.chain((_config) => {}),
  );
};
