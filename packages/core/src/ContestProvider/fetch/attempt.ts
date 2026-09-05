import { cloneInput } from "./request.ts";

export type AttemptOutcome =
  | { type: "preAborted"; reason: unknown }
  | { type: "responded"; response: Response }
  | { type: "thrown"; error: unknown; timedOut: boolean; aborted: boolean; abortReason: unknown };

export const attemptOnce = async (
  input: string | URL | Request,
  init: RequestInit | undefined,
  userSignal: AbortSignal | null | undefined,
  timeoutMs: number | undefined,
): Promise<AttemptOutcome> => {
  if (userSignal?.aborted) {
    return { type: "preAborted", reason: userSignal.reason };
  }
  const controller = new AbortController();
  const onUserAbort = () => {
    controller.abort(userSignal?.reason);
  };
  userSignal?.addEventListener("abort", onUserAbort, { once: true });
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  let timedOut = false;
  if (timeoutMs !== undefined) {
    timeoutId = setTimeout(() => {
      timedOut = true;
      controller.abort(new DOMException("fetch timeout", "TimeoutError"));
    }, timeoutMs);
  }
  try {
    const response = await fetch(cloneInput(input), { ...init, signal: controller.signal });
    return { type: "responded", response };
  } catch (error) {
    return {
      type: "thrown",
      error,
      timedOut,
      aborted: controller.signal.aborted,
      abortReason: controller.signal.reason,
    };
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
    userSignal?.removeEventListener("abort", onUserAbort);
  }
};

export const discardBody = async (response: Response | undefined): Promise<void> => {
  try {
    await response?.body?.cancel();
  } catch {}
};
