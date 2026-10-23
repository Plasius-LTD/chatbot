import { createRequire } from "node:module";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const require = createRequire(import.meta.url);
const { copyCssAssets } = require("../scripts/copy-css-assets.cjs") as {
  copyCssAssets(output: string, root?: string): void;
};
const { main: verifyPackage } = require("../scripts/verify-public-package.cjs") as {
  main(root?: string): void;
};
const roots: string[] = [];
const css = ".chatbot { color: rebeccapurple; }\n";
function fixture() {
  const root = mkdtempSync(join(tmpdir(), "chatbot-tooling-"));
  roots.push(root);
  for (const dir of ["src/styles", "dist/styles", "dist-cjs/styles"]) mkdirSync(join(root, dir), { recursive: true });
  writeFileSync(join(root, "src/styles/chatbot.module.css"), css);
  writeFileSync(join(root, "package.json"), JSON.stringify({ name: "chatbot-tooling-fixture", version: "1.0.0", files: ["dist", "dist-cjs", "frontend"] }));
  writeFileSync(join(root, "dist-cjs/package.json"), '{"type":"commonjs"}');
  return root;
}
function ready() {
  const root = fixture();
  copyCssAssets("dist", root);
  copyCssAssets("dist-cjs", root);
  return root;
}
beforeEach(() => { vi.spyOn(console, "log").mockImplementation(() => {}); vi.spyOn(console, "error").mockImplementation(() => {}); });
afterEach(() => {
  vi.restoreAllMocks();
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("portable CSS copy", () => {
  it("preserves nested module CSS bytes, ignores other files, and supports repeat builds", () => {
    const root = fixture();
    mkdirSync(join(root, "src/nested/deeper"), { recursive: true });
    writeFileSync(join(root, "src/nested/deeper/extra.module.css"), css);
    writeFileSync(join(root, "src/ignored.ts"), "export {};\n");
    for (const output of ["dist", "dist-cjs"]) {
      copyCssAssets(output, root);
      copyCssAssets(output, root);
      expect(readFileSync(join(root, output, "styles/chatbot.module.css"), "utf8")).toBe(css);
      expect(readFileSync(join(root, output, "nested/deeper/extra.module.css"), "utf8")).toBe(css);
      expect(() => readFileSync(join(root, output, "ignored.ts"))).toThrow();
    }
  });
  it("rejects missing source, non-file source, and unsupported output paths", () => {
    const root = fixture();
    expect(() => copyCssAssets("../outside", root)).toThrow("CSS output");
    rmSync(join(root, "src/styles/chatbot.module.css"));
    expect(() => copyCssAssets("dist", root)).toThrow();
    mkdirSync(join(root, "src/styles/chatbot.module.css"));
    expect(() => copyCssAssets("dist", root)).toThrow("regular file");
  });
  it("does not follow source symlinks", () => {
    const root = fixture();
    symlinkSync(join(root, "src/styles/chatbot.module.css"), join(root, "src/linked.module.css"));
    expect(() => copyCssAssets("dist", root)).toThrow("symbolic links");
  });
});

describe("public package validation", () => {
  it("accepts both packaged CSS modules with valid CommonJS metadata", () => {
    expect(() => verifyPackage(ready())).not.toThrow();
  });
  it.each(["dist", "dist-cjs"])("rejects a missing packed %s stylesheet", (output) => {
    const root = ready();
    rmSync(join(root, output, "styles/chatbot.module.css"));
    expect(() => verifyPackage(root)).toThrow(`${output}/styles/chatbot.module.css`);
  });
  it("rejects CSS omitted by package files and missing packaged CommonJS metadata", () => {
    const root = ready();
    writeFileSync(join(root, "package.json"), JSON.stringify({ name: "chatbot-tooling-fixture", version: "1.0.0", files: ["dist"] }));
    expect(() => verifyPackage(root)).toThrow("dist-cjs/package.json");
  });
  it.each(["missing", "invalid-json", "module"])("preserves %s CommonJS metadata rejection", (kind) => {
    const root = ready();
    if (kind === "missing") rmSync(join(root, "dist-cjs/package.json"));
    else writeFileSync(join(root, "dist-cjs/package.json"), kind === "invalid-json" ? "{" : '{"type":"module"}');
    expect(() => verifyPackage(root)).toThrow(/CommonJS runtime metadata/);
  });
  it("preserves private package path rejection", () => {
    const root = ready();
    mkdirSync(join(root, "frontend"));
    writeFileSync(join(root, "frontend/index.js"), "export {};\n");
    expect(() => verifyPackage(root)).toThrow("Forbidden publish paths");
  });
  it("preserves private code-reference rejection and skips generated files", () => {
    const root = ready();
    mkdirSync(join(root, "tests/nested"), { recursive: true });
    mkdirSync(join(root, "tests/dist"));
    const marker = ["pg", "p"].join("");
    writeFileSync(join(root, "tests/dist/generated.js"), marker);
    writeFileSync(join(root, "tests/nested/allowed.txt"), marker);
    symlinkSync(join(root, "src/styles/chatbot.module.css"), join(root, "tests/link.js"));
    expect(() => verifyPackage(root)).not.toThrow();
    writeFileSync(join(root, "tests/nested/example.js"), `// ${marker}\n`);
    expect(() => verifyPackage(root)).toThrow("Forbidden private/product code references");
  });
});
