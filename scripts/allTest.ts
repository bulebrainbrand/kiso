import { mkdirSync, writeFileSync } from "fs";

import { startVitest } from "vite-plus/test/node";

const vitest = await startVitest("test", undefined, {
  outputFile: ".kiso-ci/all-test.json",
  silent: true,
  reporters: ["json"],
  watch: false,
  coverage: { reporter: ["json"] },
});

await vitest.close();

mkdirSync(".kiso-ci", { recursive: true });
writeFileSync(
  ".kiso-ci/workspace.json",
  JSON.stringify({ workspace: process.cwd() }),
);
