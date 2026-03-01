#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require("node:fs");
const path = require("node:path");

const distCjsDir = path.resolve(process.cwd(), "dist-cjs");
const distCjsPackageJsonPath = path.join(distCjsDir, "package.json");

if (!fs.existsSync(distCjsDir)) {
  console.error("dist-cjs directory does not exist. Run the CJS build first.");
  process.exit(1);
}

const distCjsPackageJson = {
  type: "commonjs",
};

fs.writeFileSync(distCjsPackageJsonPath, JSON.stringify(distCjsPackageJson, null, 2) + "\n");
console.log(`Wrote ${path.relative(process.cwd(), distCjsPackageJsonPath)}`);
