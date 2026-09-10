import type { RunFailure, SessionFailure } from "@kiso/types";

export const formatFailure = (failure: RunFailure | SessionFailure): string => {
  switch (failure.type) {
    case "compile_error":
      return `compile error:\n${failure.log}`;
    case "runtime_error":
      return `runtime error:\n${failure.log}`;
    case "session_error":
      return `session error:\n${failure.log}`;
    case "validation_error":
      return [
        "validation error:",
        ...failure.issues.map((issue) => issue.message),
      ].join("\n");
    case "unexpected_error":
      return `unexpected error: ${String(failure.message)}`;
  }
};
