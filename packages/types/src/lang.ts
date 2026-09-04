import * as v from "valibot";
export const languagePluginSchema = v.object({
  name: v.string(),
});

export type LanguagePlugin = v.InferOutput<typeof languagePluginSchema>;
