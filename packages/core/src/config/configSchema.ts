import * as v from "valibot";
import { languagePluginSchema } from "@kiso/types";

const uniqueStringOrStringArraySchema = v.pipe(
  v.union([v.string(), v.array(v.string())]),
  v.transform((input) => {
    if (Array.isArray(input)) return input;
    return [input];
  }),
  v.checkItems((item, index, array) => {
    return array.indexOf(item) === index;
  }, "this array should be unique"),
);

const langDefaultSchema = v.pipe(
  v.union([
    v.object({
      langs: uniqueStringOrStringArraySchema,
      extendWhenUseLangFlag: v.optional(v.boolean(), false),
      extendWhenUseLangSetFlag: v.optional(v.boolean(), false),
    }),
    uniqueStringOrStringArraySchema,
  ]),
  v.transform((input) => {
    if (Array.isArray(input)) {
      return { langs: input, extendWhenUseLangFlag: false, extendWhenUseLangSetFlag: false };
    }
    return input;
  }),
);

export const ConfigSchema = v.pipe(
  v.object({
    lang: v.object({
      plugins: v.array(languagePluginSchema),
      default: langDefaultSchema,
      langSet: v.optional(
        v.array(
          v.object({
            name: v.string(),
            flag: uniqueStringOrStringArraySchema,
            langs: v.array(v.string()),
          }),
        ),
        [],
      ),
    }),
  }),
  v.forward(
    v.partialCheck(
      [
        ["lang", "plugins"],
        ["lang", "default", "langs"],
      ],
      (input) => {
        const names = input.lang.plugins.map((p) => p.name);
        const targets = input.lang.default.langs;
        return targets.every((t) => names.includes(t));
      },
      "lang.default.lang must be one of lang.plugins[].name",
    ),
    ["lang", "default"],
  ),
  v.forward(
    v.partialCheck(
      [
        ["lang", "plugins"],
        ["lang", "langSet"],
      ],
      (input) => {
        const names = input.lang.plugins.map((p) => p.name);

        return input.lang.langSet.every((s) => s.langs.every((t) => names.includes(t)));
      },
      "langSet[].langs must be one of lang.plugins[].name",
    ),
    ["lang", "langSet"],
  ),
);

export type Config = v.InferOutput<typeof ConfigSchema>;
