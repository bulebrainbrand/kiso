import * as E from "fp-ts/Either";

import type { Config } from "./config/configSchema.ts";
import { toUniqueArray } from "./utils/toUniqueArray.ts";

export type UnspecifiedLanguagePluginError = {
  type: "unspecified_language_plugin";
};

export type NotDefinedLanguageSetFlagError = {
  type: "not_difined_language_set_flag";
  names: string[];
};

export type LanguagePluginResolverError =
  | UnspecifiedLanguagePluginError
  | NotDefinedLanguageSetFlagError;

export const resolveLanguagePlugin = (
  langFlags: string[],
  langSetFlags: string[],
  config: Config,
): E.Either<LanguagePluginResolverError, string[]> => {
  if (langFlags.length === 0 && langSetFlags.length === 0) {
    if (config.lang.default.langs.length === 0) {
      return E.left({ type: "unspecified_language_plugin" });
    }
    return E.right(toUniqueArray(config.lang.default.langs));
  }
  const containLanguageName = resolveLangSetFlags(langSetFlags, config);
  if (E.isLeft(containLanguageName)) return containLanguageName;
  const extendDefault =
    (langFlags.length > 0 && config.lang.default.extendWhenUseLangFlag)
    || (langSetFlags.length > 0
      && config.lang.default.extendWhenUseLangSetFlag);
  if (extendDefault)
    return E.right(
      toUniqueArray([
        ...containLanguageName.right,
        ...langFlags,
        ...config.lang.default.langs,
      ]),
    );
  return E.right(toUniqueArray([...containLanguageName.right, ...langFlags]));
};

const resolveLangSetFlags = (
  langSetFlags: string[],
  config: Config,
): E.Either<NotDefinedLanguageSetFlagError, string[]> => {
  const containLanguageSet: E.Either<string, string[]>[] = langSetFlags.map(
    (name) => {
      const result = config.lang.langSet.find((set) => set.flag.includes(name));
      if (result) return E.right(result.langs);
      return E.left(name);
    },
  );
  const errors = containLanguageSet.filter(E.isLeft);
  if (errors.length > 0) {
    return E.left({
      type: "not_difined_language_set_flag",
      names: errors.map((left) => left.left),
    });
  }
  // all element is right because if there are left, errors to be errors.length > 0
  const containLanguageName = (
    containLanguageSet as E.Right<string[]>[]
  ).flatMap((set) => set.right);
  return E.right(containLanguageName);
};
