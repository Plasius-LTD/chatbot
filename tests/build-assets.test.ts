import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { afterEach, describe, expect, it } from "vitest";

const repo = process.cwd();
const manifest = JSON.parse(readFileSync(join(repo, "package.json"), "utf8"));
const roots: string[] = [];
const css = ".chatbot { color: rebeccapurple; }\n";
function fixture() {
  const root = mkdtempSync(join(tmpdir(), "chatbot-assets-"));
  roots.push(root);
  for (const dir of ["src/styles", "dist/styles", "dist-cjs/styles", "scripts", "node_modules/.bin"]) {
    mkdirSync(join(root, dir), { recursive: true });
  }
  writeFileSync(join(root, "package.json"), JSON.stringify({
    name: "chatbot-build-fixture", version: "1.0.0", scripts: manifest.scripts,
    files: ["dist", "dist-cjs"],
  }));
  for (const file of ["write-cjs-package-json.cjs", "copy-css-assets.cjs"]) {
    try { writeFileSync(join(root, "scripts", file), readFileSync(join(repo, "scripts", file))); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
  }
  writeFileSync(join(root, "node_modules/.bin/tsc"), "#!/usr/bin/env node\nprocess.exit(Number(process.env.FIXTURE_TSC_EXIT || 0));\n", { mode: 0o755 });
  writeFileSync(join(root, "src/styles/chatbot.module.css"), css);
  writeFileSync(join(root, "dist/index.js"), "export {};\n");
  writeFileSync(join(root, "dist-cjs/package.json"), '{"type":"commonjs"}');
  return root;
}
function build(root: string, env: Record<string, string> = {}) {
  return spawnSync("npm", ["run", "build"], { cwd: root, env: { ...process.env, ...env }, encoding: "utf8", timeout: 30_000 });
}
function pack(root: string) {
  return spawnSync(process.execPath, [resolve(repo, "scripts/verify-public-package.cjs")], { cwd: root, encoding: "utf8", timeout: 30_000 });
}
afterEach(() => { for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }); });

describe("build asset failure propagation", () => {
  it("fails for a missing required source even with stale outputs", () => {
    const root = fixture();
    rmSync(join(root, "src/styles/chatbot.module.css"));
    for (const dir of ["dist", "dist-cjs"]) writeFileSync(join(root, dir, "styles/chatbot.module.css"), css);
    const result = build(root);
    expect(result.error).toBeUndefined();
    expect(result.status).not.toBe(0);
  });
  it.each(["dist", "dist-cjs"])("fails when CSS cannot be written to %s", (output) => {
    const root = fixture();
    mkdirSync(join(root, output, "styles/chatbot.module.css"));
    const result = build(root);
    expect(result.error).toBeUndefined();
    expect(result.status).not.toBe(0);
  });
  it("does not mask a TypeScript compilation failure", () => {
    const result = build(fixture(), { FIXTURE_TSC_EXIT: "23" });
    expect(result.error).toBeUndefined();
    expect(result.status).not.toBe(0);
  });
  it("copies the same CSS bytes into both output formats and preserves CJS metadata", () => {
    const root = fixture();
    const result = build(root);
    expect(result.error).toBeUndefined();
    expect(result.status, result.stderr).toBe(0);
    for (const dir of ["dist", "dist-cjs"]) expect(readFileSync(join(root, dir, "styles/chatbot.module.css"), "utf8")).toBe(css);
    expect(JSON.parse(readFileSync(join(root, "dist-cjs/package.json"), "utf8")).type).toBe("commonjs");
  });
});

describe("packed runtime CSS admission", () => {
  it.each(["dist", "dist-cjs"])("rejects a package missing %s CSS", (missing) => {
    const root = fixture();
    for (const dir of ["dist", "dist-cjs"]) if (dir !== missing) writeFileSync(join(root, dir, "styles/chatbot.module.css"), css);
    const result = pack(root);
    expect(result.error).toBeUndefined();
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain(`${missing}/styles/chatbot.module.css`);
  });
  it("rejects CSS omitted by the package file list even when present on disk", () => {
    const root = fixture();
    for (const dir of ["dist", "dist-cjs"]) writeFileSync(join(root, dir, "styles/chatbot.module.css"), css);
    writeFileSync(join(root, "package.json"), JSON.stringify({ name: "chatbot-build-fixture", version: "1.0.0", files: ["dist/index.js", "dist-cjs/package.json"] }));
    const result = pack(root);
    expect(result.error).toBeUndefined();
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("dist/styles/chatbot.module.css");
  });
});
