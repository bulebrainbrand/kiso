import { toAsync, type ContestProvider } from "@kiso/types";
import { errAsync } from "neverthrow";
import * as v from "valibot";
export const yukicoder: (
  name?: string,
) => ContestProvider<{ API_KEY: string }, { API_KEY: string }> = (
  name: string = "yukicoder",
) => ({
  name,
  loginSchema: v.object({ API_KEY: v.string() }),
  login(ctx, credentials) {
    return toAsync(ctx.storage.setItem("API_KEY", credentials.API_KEY));
  },
  fetchContest() {
    return errAsync({
      type: "unexpected_error",
      message: "not implemented",
    } as const);
  },
  whoami() {
    return errAsync({
      type: "unexpected_error",
      message: "not implemented",
    } as const);
  },
});
