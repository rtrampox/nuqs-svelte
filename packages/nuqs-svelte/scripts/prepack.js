#!/usr/bin/env node
// @ts-check
import { copyFileSync } from "fs";
import { resolve, join, dirname } from "path";
import { fileURLToPath } from "url";

(() => {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const sourceDir = resolve(__dirname, "../../../");
  const targetDir = resolve(__dirname, "../");

  for (const file of ["README.md", "LICENSE"]) {
    const sourceFile = join(sourceDir, file);
    const targetFile = join(targetDir, file);
    copyFileSync(sourceFile, targetFile);
  }
})();
