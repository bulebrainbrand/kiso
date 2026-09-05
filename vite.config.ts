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
          `git diff --name-only $(git log --reverse --format="%H" | head -n 1) HEAD | node scripts/testByFile.ts && node scripts/allTest.ts`,
        ],
        cwd: ".",
        cache: false,
      },
    },
  },
});
