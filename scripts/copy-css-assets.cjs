#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");

function copyCssAssets(output, root = process.cwd()) {
  if (output !== "dist" && output !== "dist-cjs") {
    throw new Error("CSS output must be dist or dist-cjs.");
  }
  const source = path.join(root, "src");
  const required = path.join(source, "styles/chatbot.module.css");
  if (!fs.lstatSync(required).isFile()) {
    throw new Error("Required source styles/chatbot.module.css must be a regular file.");
  }
  const files = [];
  function collect(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const file = path.join(directory, entry.name);
      if (entry.isSymbolicLink()) {
        throw new Error("CSS source tree must not contain symbolic links.");
      }
      if (entry.isDirectory()) collect(file);
      else if (entry.isFile() && entry.name.endsWith(".module.css")) files.push(file);
    }
  }
  collect(source);
  for (const file of files) {
    const destination = path.join(root, output, path.relative(source, file));
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(file, destination);
  }
}

module.exports = { copyCssAssets };
if (require.main === module) copyCssAssets(process.argv[2]);
