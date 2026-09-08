import * as v from "valibot";
export type ValidationError = {
  type: "validation_error";
  issues: v.GenericIssue[];
  location?: string;
};
