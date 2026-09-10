import type { UnexpectedError } from "../contestProvider/storage.ts";
import type { ValidationError } from "../errors.ts";

export type GeneratorOptions = {
  count?: number;
  seed?: number;
};

export type GeneratedTestCase = {
  name?: string;
  input: string;
  output: string;
};

export type GeneratedInput = {
  name?: string;
  input: string;
};

export type GenerateFailure =
  | { type: "generator_not_found"; path: string }
  | { type: "generator_error"; log: string }
  | ValidationError
  | UnexpectedError;
