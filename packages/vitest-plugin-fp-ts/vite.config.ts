import { defineConfig } from "vite-plus";

export default defineConfig({
  pack: {
    dts: {
      tsgo: true,
    },
    entry: {
      index: "src/index.ts",
      vitest: "src/vitest.ts",
      "vite-plus": "src/vite-plus.ts",
    },
    exports: true,
  },
  lint: {
    rules: {
      "vite-plus/prefer-vite-plus-imports": "off",
    },
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
  fmt: {},
});
