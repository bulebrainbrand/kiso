import { defineConfig } from "vite-plus";

export default defineConfig({
  fmt: {},
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
  },
});
