import type { Contest, ContestProvider, ProviderError } from "@kiso/types";
import { pipe } from "fp-ts/function";
import * as TE from "fp-ts/TaskEither";

import { createCtxFromProvider } from "../../ContestProvider/createCtxFromProvider.ts";
import type { NewCommandSuccess } from "./entry.ts";

export const fetchNewContest = (
  provider: ContestProvider,
  contestId: string,
): TE.TaskEither<ProviderError, NewCommandSuccess> =>
  pipe(
    provider.fetchContest(createCtxFromProvider(provider), contestId),
    TE.map((contest) => ({ contest, contestId, provider })),
  );
