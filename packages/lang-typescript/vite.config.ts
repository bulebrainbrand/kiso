import { defineConfig } from "vite-plus";

export default defineConfig({
  pack: {
    dts: {
      tsgo: true,
    },
    exports: true,
  },
  lint: {
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
  fmt: {},
  test: {
    setupFiles: ["./__tests__/test-setup.ts"],
    // mocks.test.tsのようなテストヘルパー用ファイル (suiteなし) を許容する
    passWithNoTests: true,
  },
});
