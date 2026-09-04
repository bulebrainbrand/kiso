import type { ResultAsync } from "neverthrow";

export type FetchBackoff = "fixed" | "exponential";

export type FetchOptions = {
  maxRetries?: number;
  initialDelayMs?: number;
  backoff?: FetchBackoff;
  maxDelayMs?: number;
  retryOn?: number[] | ((status: number) => boolean);
  timeoutMs?: number;
};

export type FetchError =
  | { type: "not_found"; url: string }
  | { type: "fetch_error"; status: number; error: string }
  | { type: "network_error"; url: string; message: string; cause?: unknown }
  | { type: "timeout_error"; url: string; timeoutMs: number }
  | { type: "abort_error"; url: string; reason?: unknown };

export type FetchFn = (
  input: string | URL | Request,
  init?: RequestInit,
  options?: FetchOptions,
) => ResultAsync<Response, FetchError>;
