export const resolveUrl = (input: string | URL | Request): string => {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.href;
  return input.url;
};

const IDEMPOTENT_METHODS = new Set(["GET", "HEAD", "OPTIONS", "TRACE", "PUT", "DELETE", "QUERY"]);

export const resolveMethod = (input: string | URL | Request, init?: RequestInit): string => {
  const raw = init?.method ?? (input instanceof Request ? input.method : undefined) ?? "GET";
  return raw.toUpperCase();
};

export const isMethodRetryable = (input: string | URL | Request, init?: RequestInit): boolean =>
  IDEMPOTENT_METHODS.has(resolveMethod(input, init));

export const resolveUserSignal = (
  input: string | URL | Request,
  init?: RequestInit,
): AbortSignal | null | undefined =>
  init?.signal ?? (input instanceof Request ? input.signal : undefined);
