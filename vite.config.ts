import { defineConfig } from "vite-plus";

export default defineConfig({
  fmt: {
    endOfLine: "lf",
    printWidth: 80,
    quoteProps: "as-needed",
    sortImports: true,
    semi: true,
    trailingComma: "all",
    singleQuote: false,
    sortPackageJson: true,
    arrowParens: "always",
    bracketSameLine: false,
    bracketSpacing: true,
    experimentalOperatorPosition: "start",
    jsdoc: {
      lineWrappingStyle: "balance",
    },
  },
  lint: {
    jsPlugins: [{ name: "vite-plus", specifier: "vite-plus/oxlint-plugin" }],
    rules: { "vite-plus/prefer-vite-plus-imports": "error" },
    options: { typeAware: true, typeCheck: true },
  },
  test: {
    coverage: {
      provider: "v8",
      reporter: ["text"],
      enabled: true,
    },
    isolate: false,
  },
  run: {
    cache: true,
    tasks: {
      coverage: {
        command: [
          `vpr pack && git diff --name-only $(git merge-base origin/main HEAD) HEAD | node scripts/testByFile.ts && node scripts/allTest.ts`,
        ],
        cwd: ".",
        cache: false,
      },
      pack: {
        command: [
          "vp -C packages/types pack --logLevel=silent",
          "vp -C packages/core pack --logLevel=silent",
          "vp -C packages/prov-yukicoder pack --logLevel=silent",
        ],
      },
      test: {
        command: ["vpr pack --silent", "vp test"],
      },
    },
  },
});
