import { ResultAsync, type Result } from "neverthrow";

export const toAsync = <T, E>(result: Result<T, E>): ResultAsync<T, E> =>
  new ResultAsync(Promise.resolve(result));
